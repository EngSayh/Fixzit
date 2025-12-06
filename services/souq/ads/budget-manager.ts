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

import { ObjectId } from "mongodb";
import Redis from "ioredis";
import { logger } from "@/lib/logger";
import { addJob, QUEUE_NAMES } from "@/lib/queues/setup";

const DAY_SECONDS = 86400;
const DAY_MS = DAY_SECONDS * 1000;

function getKsaDatePartition(): { dateKey: string; secondsToMidnight: number } {
  // Partition budgets by Saudi local day to align with business reporting
  const now = new Date();
  const nowKsa = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }),
  );
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
  }).format(nowKsa);
  const endOfDay = new Date(nowKsa);
  endOfDay.setHours(23, 59, 59, 999);
  const secondsToMidnight = Math.max(
    60, // Ensure we never set a zero TTL
    Math.ceil((endOfDay.getTime() - nowKsa.getTime()) / 1000),
  );
  return { dateKey, secondsToMidnight };
}

function createRedisClient(): Redis | null {
  // Support REDIS_URL or REDIS_KEY (Vercel/GitHub naming convention)
  const redisUrl = process.env.BULLMQ_REDIS_URL || process.env.REDIS_URL || process.env.REDIS_KEY;
  const redisHost = process.env.BULLMQ_REDIS_HOST;
  const redisPort = parseInt(process.env.BULLMQ_REDIS_PORT || "6379", 10);
  const redisPassword =
    process.env.BULLMQ_REDIS_PASSWORD || process.env.REDIS_PASSWORD;
  
  // 🔐 STRICT v4.1: Redis is REQUIRED for production budget enforcement
  // Without Redis, budget limits are not shared across instances, enabling overspend
  const isProduction = process.env.NODE_ENV === "production";
  const isTest = process.env.NODE_ENV === "test";
  const allowFallback = process.env.BUDGET_ALLOW_MEMORY_FALLBACK === "true";
  
  if (!redisUrl && !redisHost) {
    if (isProduction && !allowFallback) {
      // Fail closed in production - budget enforcement MUST be reliable
      throw new Error(
        "[BudgetManager] Redis is REQUIRED for ad budget enforcement in production. " +
        "Set BULLMQ_REDIS_URL/REDIS_URL or BUDGET_ALLOW_MEMORY_FALLBACK=true to allow degraded mode."
      );
    }
    if (!isTest) {
      logger.warn(
        "[BudgetManager] Redis not configured. Falling back to in-memory budget tracking. " +
        "⚠️ Budget limits will NOT be shared across instances - risk of overspend.",
      );
    }
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

function setLocalSpend(key: string, spent: number, ttlMs: number = DAY_MS) {
  localBudget.set(key, { spent, expiresAt: Date.now() + ttlMs });
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
   * Normalize orgId - KEEP AS STRING
   * Schema: souq_campaigns.orgId is String (see server/models/souq/Advertising.ts)
   * AUDIT-2025-12-06: Fixed to stop casting to ObjectId which breaks queries for hex-like org IDs
   */
  private static normalizeOrg(orgId: string): {
    orgFilter: string;
    orgKey: string;
    orgCandidates: string[];
  } {
    // orgId is stored as String in schema - keep it as string only to align with indexes
    return { orgFilter: orgId, orgKey: orgId, orgCandidates: [orgId] };
  }

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
    const { orgCandidates, orgKey } = this.normalizeOrg(orgId);
    const { key, ttlSeconds } = this.getBudgetPartition(campaignId, orgKey);

    // Fetch daily budget from database
    const campaign = await this.fetchCampaign(campaignId, orgCandidates);
    if (!campaign) return false;
    // Do not charge if campaign is paused/inactive
    if (campaign.status !== "active") {
      logger.warn(
        `[BudgetManager] Charge blocked; campaign ${campaignId} is ${campaign.status}`,
      );
      return false;
    }

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
        redis.call('EXPIRE', KEYS[1], tonumber(ARGV[3]))
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
        ttlSeconds.toString(),
      );

      const success = result === 1;

      if (success) {
        await this.checkBudgetThresholds(campaignId, orgKey);
      }

      return success;
    }

    const currentSpent = getLocalSpend(key);
    if (currentSpent + amount <= campaign.dailyBudget) {
      setLocalSpend(key, currentSpent + amount, ttlSeconds * 1000);
      await this.checkBudgetThresholds(campaignId, orgKey);
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
    const { orgCandidates, orgKey } = this.normalizeOrg(orgId);
    const { key } = this.getBudgetPartition(campaignId, orgKey);
    const spentToday = redis
      ? parseFloat((await redis.get(key)) || "0")
      : getLocalSpend(key);

    const campaign = await this.fetchCampaign(campaignId, orgCandidates);

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
    const { orgCandidates, orgKey } = this.normalizeOrg(orgId);
    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    // Get all active campaigns
    const campaigns = await db
      .collection("souq_campaigns")
      .find({ status: "active", orgId: { $in: orgCandidates } })
      .toArray();

    let resetCount = 0;

    for (const campaign of campaigns) {
      // AUDIT-2025-12-06: campaign.orgId is String per schema - normalize to string key but allow legacy ObjectId
      const campaignOrgKey =
        typeof campaign.orgId === "string"
          ? campaign.orgId
          : campaign.orgId
            ? String(campaign.orgId)
            : undefined;
      if (!campaignOrgKey) {
        logger.warn(`[BudgetManager] Skipping reset for campaign ${campaign.campaignId} due to missing orgId`);
        continue;
      }
      const { key } = this.getBudgetPartition(campaign.campaignId, campaignOrgKey);

      // Delete Redis key (will start fresh tomorrow)
      if (redis) {
        await redis.del(key);
      } else {
        deleteLocalSpend(key);
      }

      // Reset spentToday in MongoDB with orgId scoping
      // AUDIT-2025-12-06: Use String orgId to match schema
      await db
        .collection("souq_campaigns")
        .updateOne(
          {
            campaignId: campaign.campaignId,
            orgId: {
              $in: this.normalizeOrg(campaignOrgKey).orgCandidates,
            },
          },
          { $set: { spentToday: 0, lastBudgetReset: new Date() } },
        );

      resetCount++;
    }

    logger.info(`[BudgetManager] Reset ${resetCount} campaign budgets for org ${orgKey}`);

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
    const { orgCandidates, orgKey } = this.normalizeOrg(orgId);
    const { key } = this.getBudgetPartition(campaignId, orgKey);
    if (redis) {
      await redis.del(key);
    } else {
      deleteLocalSpend(key);
    }

    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    await db
      .collection("souq_campaigns")
      .updateOne(
        { campaignId, orgId: { $in: orgCandidates } },
        { $set: { spentToday: 0, lastBudgetReset: new Date() } },
      );

    logger.info(`[BudgetManager] Reset budget for campaign: ${campaignId} in org ${orgKey}`);
  }

  /**
   * Check budget thresholds and send alerts / pause campaign
   */
  private static async checkBudgetThresholds(
    campaignId: string,
    orgId: string,
  ): Promise<void> {
    const { orgKey } = this.normalizeOrg(orgId);
    const status = await this.getBudgetStatus(campaignId, orgKey);
    const percentage = status.percentageUsed / 100;
    const { secondsToMidnight } = getKsaDatePartition();

    // Check if we crossed any threshold
    for (const threshold of this.ALERT_THRESHOLDS) {
      if (percentage >= threshold) {
        const alertKey = `${this.REDIS_PREFIX}alert:${orgKey}:${campaignId}:${threshold}`;
        const alreadySent = redis
          ? await redis.get(alertKey)
          : hasLocalAlert(alertKey)
            ? "1"
            : null;

        if (!alreadySent) {
          await this.sendBudgetAlert(campaignId, orgId, threshold);
          if (redis) {
            await redis.set(alertKey, "1", "EX", secondsToMidnight); // Don't send again today (KSA midnight aligned)
          } else {
            setLocalAlert(alertKey, secondsToMidnight);
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
    const { orgCandidates, orgKey } = this.normalizeOrg(orgId);
    const campaign = await this.fetchCampaign(campaignId, orgCandidates);
    if (!campaign) return;

    const percentage = Math.round(threshold * 100);

    logger.info(
      `[BudgetManager] ALERT: Campaign ${campaignId} has used ${percentage}% of daily budget`,
    );

    await this.enqueueSellerAlert({
      sellerId: campaign.sellerId,
      orgId: orgKey,
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

    const { orgCandidates, orgKey } = this.normalizeOrg(orgId);
    const campaign = await this.fetchCampaign(campaignId, orgCandidates);

    // 🔐 STRICT v4.1: Include orgId in filter
    await db.collection("souq_campaigns").updateOne(
      { campaignId, orgId: { $in: orgCandidates } },
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
      orgId: orgKey,
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
    orgId: string; // 🔐 STRICT v4.1: orgId is now REQUIRED
    template: string;
    internalAudience: string;
    subject: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    const { sellerId, template, internalAudience, subject, data, orgId: providedOrgId } = params;

    // 🔐 STRICT v4.1: Require orgId to prevent cross-tenant notification leakage
    if (!providedOrgId) {
      throw new Error('orgId is required for enqueueSellerAlert (STRICT v4.1 tenant isolation)');
    }

    // 🔐 STRICT v4.1: Verify seller belongs to this org before sending notifications
    // This prevents cross-tenant metadata leakage and ensures correct branding
    let orgId: string = providedOrgId;
    try {
      const { SouqSeller } = await import("@/server/models/souq/Seller");
      const orgCandidates = ObjectId.isValid(providedOrgId)
        ? [providedOrgId, new ObjectId(providedOrgId)]
        : [providedOrgId];
      const sellerFilter = ObjectId.isValid(sellerId) ? new ObjectId(sellerId) : sellerId;
      // 🔐 FIX: Use findOne with orgId scoping instead of findById
      const seller = await SouqSeller.findOne({
        _id: sellerFilter,
        orgId: { $in: orgCandidates },
      })
        .select("orgId")
        .lean();
      
      if (!seller) {
        logger.warn(`[BudgetManager] Seller ${sellerId} not found in org ${providedOrgId}, skipping alert`, {
          sellerId,
          orgId: providedOrgId,
          component: "BudgetManager",
          action: "enqueueSellerAlert",
        });
        return; // Don't send notification if seller doesn't belong to this org
      }
      orgId = seller.orgId ? String(seller.orgId) : providedOrgId;
    } catch (error) {
      logger.error(`[BudgetManager] Failed to verify seller org for ${sellerId}`, {
        error,
        sellerId,
        orgId: providedOrgId,
        component: "BudgetManager",
        action: "enqueueSellerAlert",
      });
      // 🔐 STRICT v4.1: Fail-safe - don't send notification if we can't verify tenant
      return;
    }
    const orgKey = orgId;

    await Promise.all([
      addJob(QUEUE_NAMES.NOTIFICATIONS, "send-email", {
        to: sellerId,
        orgId: orgKey, // 🔐 Tenant-specific routing for branding/templates
        template,
        data,
      }),
      addJob(QUEUE_NAMES.NOTIFICATIONS, "internal-notification", {
        to: internalAudience,
        orgId: orgKey, // 🔐 Include for audit/routing
        priority: "normal",
        message: subject,
        metadata: data,
      }),
    ]);
  }

  /**
   * Get budget key and TTL aligned to Saudi midnight
   * @param orgId - Required for tenant isolation in Redis keys
   */
  private static getBudgetPartition(
    campaignId: string,
    orgId: string,
  ): { key: string; ttlSeconds: number } {
    const { dateKey, secondsToMidnight } = getKsaDatePartition();
    return {
      key: `${this.REDIS_PREFIX}${orgId}:${campaignId}:${dateKey}`,
      ttlSeconds: secondsToMidnight,
    };
  }

  /**
   * Fetch campaign from database
   * @param orgId - Required for STRICT v4.1 tenant isolation
   * AUDIT-2025-12-06: orgId is String per schema - do NOT convert to ObjectId
   */
  private static async fetchCampaign(
    campaignId: string,
    orgCandidates: string | ObjectId | (string | ObjectId)[],
  ): Promise<{
    campaignId: string;
    orgId: string;
    dailyBudget: number;
    status: string;
    sellerId: string;
  } | null> {
    if (
      !orgCandidates ||
      (Array.isArray(orgCandidates) && orgCandidates.length === 0)
    ) {
      throw new Error('orgId is required for fetchCampaign (STRICT v4.1 tenant isolation)');
    }
    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    // AUDIT-2025-12-06: souq_campaigns.orgId is String - use directly; also accept legacy ObjectId
    const campaigns = await findWithOrgFallback(
      db.collection("souq_campaigns"),
      { campaignId } as Record<string, unknown>,
      Array.isArray(orgCandidates) ? orgCandidates : [orgCandidates],
    );
    const campaign = campaigns[0] ?? null;

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
    const { orgCandidates, orgKey } = this.normalizeOrg(orgId);
    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    // 🔐 STRICT v4.1: Include orgId in query for tenant isolation
    const sellerFilter = ObjectId.isValid(sellerId) && typeof sellerId === "string"
      ? { $in: [sellerId, new ObjectId(sellerId)] }
      : sellerId;
    let campaigns = await db
      .collection("souq_campaigns")
      .find({
        sellerId: sellerFilter,
        orgId: { $in: orgCandidates },
      })
      .toArray();

    // 🧪 Mock/driver fallback: retry with primary org when $in is unsupported
    if (campaigns.length === 0 && orgCandidates.length > 0) {
      campaigns = await db
        .collection("souq_campaigns")
        .find({
          sellerId: sellerFilter,
          orgId: orgCandidates[0],
        })
        .toArray();
    }

    let totalDailyBudget = 0;
    let totalSpentToday = 0;
    let activeCampaigns = 0;
    let pausedCampaigns = 0;

    const budgetStatuses: BudgetStatus[] = [];

    // 🚀 PERF: Batch Redis reads instead of N+1 per-campaign calls
    // Build partition keys for all campaigns at once
    const { dateKey } = getKsaDatePartition();
    type CampaignDoc = { campaignId?: string; status?: string; dailyBudget?: number };
    const partitionKeys = (campaigns as CampaignDoc[]).map(
      (c) => `${this.REDIS_PREFIX}${orgKey}:${c.campaignId}:${dateKey}`,
    );

    // Batch fetch all spend values in one Redis call (mget)
    let spentValues: (string | null)[] = [];
    if (redis && partitionKeys.length > 0) {
      try {
        spentValues = await redis.mget(...partitionKeys);
      } catch (error) {
        logger.warn("[BudgetManager] Redis mget failed, falling back to per-campaign fetch", { error });
        // Fallback to individual calls if mget fails
        spentValues = [];
      }
    }

    // Process campaigns using batched data where available
    const typedCampaigns = campaigns as CampaignDoc[];
    for (let i = 0; i < typedCampaigns.length; i++) {
      const campaign = typedCampaigns[i];
      const dailyBudget = campaign.dailyBudget || 0;
      
      // Use batched value if available, otherwise fall back to individual fetch
      let spentToday: number;
      if (spentValues.length > 0 && spentValues[i] !== null && spentValues[i] !== undefined) {
        spentToday = parseFloat(spentValues[i]!) || 0;
      } else if (redis) {
        // Fallback for missing batched values
        const val = await redis.get(partitionKeys[i]);
        spentToday = val ? parseFloat(val) : 0;
      } else {
        spentToday = getLocalSpend(partitionKeys[i]);
      }

      const remainingBudget = Math.max(0, dailyBudget - spentToday);
      const isActive = campaign.status === "active" && remainingBudget > 0;
      const percentageUsed = dailyBudget > 0 ? (spentToday / dailyBudget) * 100 : 0;

      const status: BudgetStatus = {
        campaignId: campaign.campaignId || "",
        dailyBudget,
        spentToday,
        remainingBudget,
        percentageUsed,
        isActive,
        lastReset: dateKey,
      };

      budgetStatuses.push(status);

      totalDailyBudget += dailyBudget;
      totalSpentToday += spentToday;

      if (isActive) {
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

    const { orgCandidates, orgKey } = this.normalizeOrg(orgId);
    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    await db
      .collection("souq_campaigns")
      .updateOne({ campaignId, orgId: { $in: orgCandidates } }, { $set: { dailyBudget: newBudget } });

    logger.info(
      `[BudgetManager] Updated budget for ${campaignId}: ${newBudget} SAR (org ${orgKey})`,
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
    const { orgCandidates } = this.normalizeOrg(orgId);
    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    const now = new Date();
    const startKsa = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }),
    );
    startKsa.setDate(startKsa.getDate() - days);
    const startDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh",
    }).format(startKsa);

    const history = await db
      .collection("souq_ad_daily_spend")
      .find({
        campaignId,
        orgId: { $in: orgCandidates },
        date: { $gte: startDateStr },
      })
      .sort({ date: 1 })
      .toArray();

    return history.map((record) => ({
      date: record.date,
      spend: record.spend,
    }));
  }
}
