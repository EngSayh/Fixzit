/**
 * Budget Manager Service
 *
 * Manages advertising budgets with Redis-based real-time tracking:
 * - Daily budget caps
 * - Real-time spend tracking
 * - Budget alerts (75%, 90%, 100%)
 * - Auto-pause when depleted
 * - Budget reset at midnight (Saudi time)
 */

import Redis from "ioredis";
import { logger } from "@/lib/logger";
import { addJob, QUEUE_NAMES } from "@/lib/queues/setup";

const DAY_SECONDS = 86400;
const DAY_MS = DAY_SECONDS * 1000;

function createRedisClient(): Redis | null {
  // Support REDIS_URL or REDIS_KEY (Vercel/GitHub naming convention)
  const redisUrl = process.env.BULLMQ_REDIS_URL || process.env.REDIS_URL || process.env.REDIS_KEY;
  const redisHost = process.env.BULLMQ_REDIS_HOST;
  const redisPort = parseInt(process.env.BULLMQ_REDIS_PORT || "6379", 10);
  const redisPassword =
    process.env.BULLMQ_REDIS_PASSWORD || process.env.REDIS_PASSWORD;
  if (!redisUrl && !redisHost) {
    logger.warn(
      "[BudgetManager] Redis not configured. Falling back to in-memory budget tracking.",
    );
    return null;
  }

  const client = redisUrl
    ? new Redis(redisUrl, { lazyConnect: true })
    : new Redis({
        host: redisHost!,
        port: redisPort,
        password: redisPassword,
        lazyConnect: true,
      });

  client.on("error", (error) => {
    logger.error("[BudgetManager] Redis connection error", error);
  });

  return client;
}

const redis = createRedisClient();

type LocalBudgetEntry = { spent: number; expiresAt: number };
const localBudget = new Map<string, LocalBudgetEntry>();
const localAlerts = new Map<string, number>();

function getLocalSpend(key: string): number {
  const entry = localBudget.get(key);
  if (!entry) return 0;
  if (entry.expiresAt <= Date.now()) {
    localBudget.delete(key);
    return 0;
  }
  return entry.spent;
}

function setLocalSpend(key: string, spent: number) {
  localBudget.set(key, { spent, expiresAt: Date.now() + DAY_MS });
}

function deleteLocalSpend(key: string) {
  localBudget.delete(key);
}

function hasLocalAlert(key: string): boolean {
  const expiresAt = localAlerts.get(key);
  if (!expiresAt || expiresAt <= Date.now()) {
    localAlerts.delete(key);
    return false;
  }
  return true;
}

function setLocalAlert(key: string, ttlSeconds: number) {
  localAlerts.set(key, Date.now() + ttlSeconds * 1000);
}

interface BudgetStatus {
  campaignId: string;
  dailyBudget: number;
  spentToday: number;
  remainingBudget: number;
  percentageUsed: number;
  isActive: boolean;
  lastReset: string;
}

export class BudgetManager {
  private static REDIS_PREFIX = "ad_budget:";
  private static ALERT_THRESHOLDS = [0.75, 0.9, 1.0]; // 75%, 90%, 100%

  /**
   * Check if campaign has budget available for a click
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  static async canCharge(campaignId: string, orgId: string, amount: number): Promise<boolean> {
    if (!orgId) {
      throw new Error('orgId is required for canCharge (STRICT v4.1 tenant isolation)');
    }
    const status = await this.getBudgetStatus(campaignId, orgId);

    if (!status.isActive) return false;

    return status.remainingBudget >= amount;
  }

  /**
   * Charge campaign budget (atomic operation)
   * Returns true if charge succeeded, false if insufficient budget
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  static async chargeBudget(
    campaignId: string,
    orgId: string,
    amount: number,
  ): Promise<boolean> {
    if (!orgId) {
      throw new Error('orgId is required for chargeBudget (STRICT v4.1 tenant isolation)');
    }
    const key = this.getBudgetKey(campaignId, orgId);

    // Fetch daily budget from database
    const campaign = await this.fetchCampaign(campaignId, orgId);
    if (!campaign) return false;

    // Guard against zero/negative budget
    if (!campaign.dailyBudget || campaign.dailyBudget <= 0) {
      logger.warn(`[BudgetManager] Campaign ${campaignId} has invalid dailyBudget: ${campaign.dailyBudget}`);
      return false;
    }

    if (redis) {
      const script = `
      local spent = redis.call('GET', KEYS[1]) or '0'
      local spentNum = tonumber(spent)
      local amountNum = tonumber(ARGV[1])
      local budgetNum = tonumber(ARGV[2])
      
      if spentNum + amountNum <= budgetNum then
        redis.call('INCRBYFLOAT', KEYS[1], amountNum)
        redis.call('EXPIRE', KEYS[1], 86400)
        return 1
      else
        return 0
      end
    `;

      const result = await redis.eval(
        script,
        1,
        key,
        amount.toString(),
        campaign.dailyBudget.toString(),
      );

      const success = result === 1;

      if (success) {
        await this.checkBudgetThresholds(campaignId, orgId);
      }

      return success;
    }

    const currentSpent = getLocalSpend(key);
    if (currentSpent + amount <= campaign.dailyBudget) {
      setLocalSpend(key, currentSpent + amount);
      await this.checkBudgetThresholds(campaignId, orgId);
      return true;
    }

    return false;
  }

  /**
   * Get current budget status
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  static async getBudgetStatus(campaignId: string, orgId: string): Promise<BudgetStatus> {
    if (!orgId) {
      throw new Error('orgId is required for getBudgetStatus (STRICT v4.1 tenant isolation)');
    }
    const key = this.getBudgetKey(campaignId, orgId);
    const spentToday = redis
      ? parseFloat((await redis.get(key)) || "0")
      : getLocalSpend(key);

    const campaign = await this.fetchCampaign(campaignId, orgId);

    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId} in org ${orgId}`);
    }

    const dailyBudget = campaign.dailyBudget || 0;
    const remainingBudget = Math.max(0, dailyBudget - spentToday);
    // Guard against divide by zero
    const percentageUsed = dailyBudget > 0 ? (spentToday / dailyBudget) * 100 : 0;

    return {
      campaignId,
      dailyBudget,
      spentToday,
      remainingBudget,
      percentageUsed,
      isActive: campaign.status === "active" && remainingBudget > 0,
      lastReset: new Date().toISOString().split("T")[0], // Today's date
    };
  }

  /**
   * Reset all campaign budgets for an organization (runs daily at midnight Saudi time)
   * @param orgId - Required for STRICT v4.1 tenant isolation.
   */
  static async resetAllBudgets(orgId: string): Promise<{ reset: number }> {
    if (!orgId) {
      throw new Error('orgId is required to reset budgets (STRICT v4.1 tenant isolation)');
    }
    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    // Get all active campaigns
    const campaigns = await db
      .collection("souq_ad_campaigns")
      .find({ status: "active", orgId })
      .toArray();

    let resetCount = 0;

    for (const campaign of campaigns) {
      const campaignOrgId = campaign.orgId?.toString() || orgId;
      if (!campaignOrgId) {
        logger.warn(`[BudgetManager] Skipping reset for campaign ${campaign.campaignId} due to missing orgId`);
        continue;
      }
      const key = this.getBudgetKey(campaign.campaignId, campaignOrgId);

      // Delete Redis key (will start fresh tomorrow)
      if (redis) {
        await redis.del(key);
      } else {
        deleteLocalSpend(key);
      }

      // Reset spentToday in MongoDB with orgId scoping
      await db
        .collection("souq_ad_campaigns")
        .updateOne(
          { campaignId: campaign.campaignId, orgId: campaign.orgId },
          { $set: { spentToday: 0, lastBudgetReset: new Date() } },
        );

      resetCount++;
    }

    logger.info(`[BudgetManager] Reset ${resetCount} campaign budgets for org ${orgId}`);

    return { reset: resetCount };
  }

  /**
   * Reset single campaign budget (manual)
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  static async resetCampaignBudget(campaignId: string, orgId: string): Promise<void> {
    if (!orgId) {
      throw new Error('orgId is required for resetCampaignBudget (STRICT v4.1 tenant isolation)');
    }
    const key = this.getBudgetKey(campaignId, orgId);
    if (redis) {
      await redis.del(key);
    } else {
      deleteLocalSpend(key);
    }

    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    await db
      .collection("souq_ad_campaigns")
      .updateOne(
        { campaignId, orgId },
        { $set: { spentToday: 0, lastBudgetReset: new Date() } },
      );

    logger.info(`[BudgetManager] Reset budget for campaign: ${campaignId} in org ${orgId}`);
  }

  /**
   * Check budget thresholds and send alerts / pause campaign
   */
  private static async checkBudgetThresholds(
    campaignId: string,
    orgId: string,
  ): Promise<void> {
    const status = await this.getBudgetStatus(campaignId, orgId);
    const percentage = status.percentageUsed / 100;

    // Check if we crossed any threshold
    for (const threshold of this.ALERT_THRESHOLDS) {
      if (percentage >= threshold) {
        const alertKey = `${this.REDIS_PREFIX}alert:${orgId}:${campaignId}:${threshold}`;
        const alreadySent = redis
          ? await redis.get(alertKey)
          : hasLocalAlert(alertKey)
            ? "1"
            : null;

        if (!alreadySent) {
          await this.sendBudgetAlert(campaignId, orgId, threshold);
          if (redis) {
            await redis.set(alertKey, "1", "EX", DAY_SECONDS); // Don't send again today
          } else {
            setLocalAlert(alertKey, DAY_SECONDS);
          }
        }
      }
    }

    // Auto-pause if budget depleted
    if (percentage >= 1.0) {
      await this.pauseCampaign(campaignId, orgId, "budget_depleted");
    }
  }

  /**
   * Send budget alert notification
   */
  private static async sendBudgetAlert(
    campaignId: string,
    orgId: string,
    threshold: number,
  ): Promise<void> {
    const campaign = await this.fetchCampaign(campaignId, orgId);
    if (!campaign) return;

    const percentage = Math.round(threshold * 100);

    logger.info(
      `[BudgetManager] ALERT: Campaign ${campaignId} has used ${percentage}% of daily budget`,
    );

    await this.enqueueSellerAlert({
      sellerId: campaign.sellerId,
      orgId,
      template: "souq_ad_budget_alert",
      internalAudience: "souq-ads-ops",
      subject: `Campaign ${campaignId} reached ${percentage}% of its budget`,
      data: {
        campaignId,
        sellerId: campaign.sellerId,
        percentage,
        dailyBudget: campaign.dailyBudget,
      },
    });
  }

  /**
   * Pause campaign due to budget depletion
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  private static async pauseCampaign(
    campaignId: string,
    orgId: string,
    reason: "budget_depleted" | "manual",
  ): Promise<void> {
    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    const campaign = await this.fetchCampaign(campaignId, orgId);

    // 🔐 STRICT v4.1: Include orgId in filter
    await db.collection("souq_ad_campaigns").updateOne(
      { campaignId, orgId },
      {
        $set: {
          status: "paused",
          pauseReason: reason,
          pausedAt: new Date(),
        },
      },
    );

    logger.info(`[BudgetManager] Paused campaign ${campaignId}: ${reason}`);

    await this.enqueueSellerAlert({
      sellerId: campaign?.sellerId || "unknown",
      orgId,
      template: "souq_ad_campaign_paused",
      internalAudience: "souq-ads-ops",
      subject: `Campaign ${campaignId} paused (${reason})`,
      data: {
        campaignId,
        reason,
      },
    });
  }

  private static async enqueueSellerAlert(params: {
    sellerId: string;
    orgId?: string;
    template: string;
    internalAudience: string;
    subject: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    const { sellerId, template, internalAudience, subject, data, orgId: providedOrgId } = params;

    // 🔐 Tenant-specific routing: Prefer provided orgId, otherwise fetch from seller
    let orgId: string | undefined = providedOrgId;
    try {
      if (!orgId) {
        const { SouqSeller } = await import("@/server/models/souq/Seller");
        const seller = await SouqSeller.findById(sellerId).select("orgId").lean();
        orgId = seller?.orgId?.toString();
      }
    } catch (error) {
      logger.warn(`[BudgetManager] Could not fetch orgId for seller ${sellerId}`, {
        error,
        sellerId,
        component: "BudgetManager",
        action: "enqueueSellerAlert",
      });
    }

    await Promise.all([
      addJob(QUEUE_NAMES.NOTIFICATIONS, "send-email", {
        to: sellerId,
        orgId, // 🔐 Tenant-specific routing for branding/templates
        template,
        data,
      }),
      addJob(QUEUE_NAMES.NOTIFICATIONS, "internal-notification", {
        to: internalAudience,
        orgId, // 🔐 Include for audit/routing
        priority: "normal",
        message: subject,
        metadata: data,
      }),
    ]);
  }

  /**
   * Get budget key for Redis
   * @param orgId - Required for tenant isolation in Redis keys
   */
  private static getBudgetKey(campaignId: string, orgId: string): string {
    const today = new Date().toISOString().split("T")[0];
    return `${this.REDIS_PREFIX}${orgId}:${campaignId}:${today}`;
  }

  /**
   * Fetch campaign from database
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  private static async fetchCampaign(campaignId: string, orgId: string): Promise<{
    campaignId: string;
    orgId: string;
    dailyBudget: number;
    status: string;
    sellerId: string;
  } | null> {
    if (!orgId) {
      throw new Error('orgId is required for fetchCampaign (STRICT v4.1 tenant isolation)');
    }
    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    const campaign = await db
      .collection("souq_ad_campaigns")
      .findOne({ campaignId, orgId });

    return campaign as unknown as {
      campaignId: string;
      orgId: string;
      dailyBudget: number;
      status: string;
      sellerId: string;
    } | null;
  }

  /**
   * Get aggregated budget stats for all campaigns
   * @param sellerId - The seller ID
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  static async getCampaignsBudgetSummary(sellerId: string, orgId: string): Promise<{
    totalDailyBudget: number;
    totalSpentToday: number;
    activeCampaigns: number;
    pausedCampaigns: number;
    campaigns: BudgetStatus[];
  }> {
    // 🔐 STRICT v4.1: Require orgId for tenant isolation
    if (!orgId) {
      throw new Error('orgId is required for campaign budget summary (STRICT v4.1 tenant isolation)');
    }
    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    // 🔐 STRICT v4.1: Include orgId in query for tenant isolation
    const campaigns = await db
      .collection("souq_ad_campaigns")
      .find({ sellerId, orgId })
      .toArray();

    let totalDailyBudget = 0;
    let totalSpentToday = 0;
    let activeCampaigns = 0;
    let pausedCampaigns = 0;

    const budgetStatuses: BudgetStatus[] = [];

    for (const campaign of campaigns) {
      const status = await this.getBudgetStatus(campaign.campaignId, orgId);
      budgetStatuses.push(status);

      totalDailyBudget += status.dailyBudget;
      totalSpentToday += status.spentToday;

      if (status.isActive) {
        activeCampaigns++;
      } else if (campaign.status === "paused") {
        pausedCampaigns++;
      }
    }

    return {
      totalDailyBudget,
      totalSpentToday,
      activeCampaigns,
      pausedCampaigns,
      campaigns: budgetStatuses,
    };
  }

  /**
   * Update campaign daily budget
   */
  static async updateDailyBudget(
    campaignId: string,
    orgId: string,
    newBudget: number,
  ): Promise<void> {
    if (!orgId) {
      throw new Error('orgId is required to update daily budget (STRICT v4.1 tenant isolation)');
    }
    if (newBudget < 10) {
      throw new Error("Daily budget must be at least 10 SAR");
    }

    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    await db
      .collection("souq_ad_campaigns")
      .updateOne({ campaignId, orgId }, { $set: { dailyBudget: newBudget } });

    logger.info(
      `[BudgetManager] Updated budget for ${campaignId}: ${newBudget} SAR`,
    );
  }

  /**
   * Get spend history (last 30 days)
   */
  static async getSpendHistory(
    campaignId: string,
    orgId: string,
    days: number = 30,
  ): Promise<
    {
      date: string;
      spend: number;
    }[]
  > {
    if (!orgId) {
      throw new Error('orgId is required to fetch spend history (STRICT v4.1 tenant isolation)');
    }
    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await db
      .collection("souq_ad_daily_spend")
      .find({
        campaignId,
        orgId,
        date: { $gte: startDate.toISOString().split("T")[0] },
      })
      .sort({ date: 1 })
      .toArray();

    return history.map((record) => ({
      date: record.date,
      spend: record.spend,
    }));
  }
}
