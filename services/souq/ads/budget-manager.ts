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

import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.BULLMQ_REDIS_HOST || 'localhost',
  port: parseInt(process.env.BULLMQ_REDIS_PORT || '6379'),
  password: process.env.BULLMQ_REDIS_PASSWORD,
});

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
  private static REDIS_PREFIX = 'ad_budget:';
  private static ALERT_THRESHOLDS = [0.75, 0.90, 1.0]; // 75%, 90%, 100%

  /**
   * Check if campaign has budget available for a click
   */
  static async canCharge(campaignId: string, amount: number): Promise<boolean> {
    const status = await this.getBudgetStatus(campaignId);
    
    if (!status.isActive) return false;
    
    return status.remainingBudget >= amount;
  }

  /**
   * Charge campaign budget (atomic operation)
   * Returns true if charge succeeded, false if insufficient budget
   */
  static async chargeBudget(campaignId: string, amount: number): Promise<boolean> {
    const key = this.getBudgetKey(campaignId);
    
    // Fetch daily budget from database
    const campaign = await this.fetchCampaign(campaignId);
    if (!campaign) return false;

    // Atomic increment with budget check
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
      campaign.dailyBudget.toString()
    );

    const success = result === 1;

    if (success) {
      // Check if we need to send alerts or pause campaign
      await this.checkBudgetThresholds(campaignId);
    }

    return success;
  }

  /**
   * Get current budget status
   */
  static async getBudgetStatus(campaignId: string): Promise<BudgetStatus> {
    const key = this.getBudgetKey(campaignId);
    const spentStr = await redis.get(key);
    const spentToday = parseFloat(spentStr || '0');

    const campaign = await this.fetchCampaign(campaignId);
    
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    const dailyBudget = campaign.dailyBudget;
    const remainingBudget = Math.max(0, dailyBudget - spentToday);
    const percentageUsed = (spentToday / dailyBudget) * 100;

    return {
      campaignId,
      dailyBudget,
      spentToday,
      remainingBudget,
      percentageUsed,
      isActive: campaign.status === 'active' && remainingBudget > 0,
      lastReset: new Date().toISOString().split('T')[0], // Today's date
    };
  }

  /**
   * Reset all campaign budgets (runs daily at midnight Saudi time)
   */
  static async resetAllBudgets(): Promise<{ reset: number }> {
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();

    // Get all active campaigns
    const campaigns = await db
      .collection('souq_ad_campaigns')
      .find({ status: 'active' })
      .toArray();

    let resetCount = 0;

    for (const campaign of campaigns) {
      const key = this.getBudgetKey(campaign.campaignId);
      
      // Delete Redis key (will start fresh tomorrow)
      await redis.del(key);
      
      // Reset spentToday in MongoDB
      await db.collection('souq_ad_campaigns').updateOne(
        { campaignId: campaign.campaignId },
        { $set: { spentToday: 0, lastBudgetReset: new Date() } }
      );

      resetCount++;
    }

    console.log(`[BudgetManager] Reset ${resetCount} campaign budgets`);
    
    return { reset: resetCount };
  }

  /**
   * Reset single campaign budget (manual)
   */
  static async resetCampaignBudget(campaignId: string): Promise<void> {
    const key = this.getBudgetKey(campaignId);
    await redis.del(key);

    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();

    await db.collection('souq_ad_campaigns').updateOne(
      { campaignId },
      { $set: { spentToday: 0, lastBudgetReset: new Date() } }
    );

    console.log(`[BudgetManager] Reset budget for campaign: ${campaignId}`);
  }

  /**
   * Check budget thresholds and send alerts / pause campaign
   */
  private static async checkBudgetThresholds(campaignId: string): Promise<void> {
    const status = await this.getBudgetStatus(campaignId);
    const percentage = status.percentageUsed / 100;

    // Check if we crossed any threshold
    for (const threshold of this.ALERT_THRESHOLDS) {
      if (percentage >= threshold) {
        const alertKey = `${this.REDIS_PREFIX}alert:${campaignId}:${threshold}`;
        const alreadySent = await redis.get(alertKey);

        if (!alreadySent) {
          await this.sendBudgetAlert(campaignId, threshold);
          await redis.set(alertKey, '1', 'EX', 86400); // Don't send again today
        }
      }
    }

    // Auto-pause if budget depleted
    if (percentage >= 1.0) {
      await this.pauseCampaign(campaignId, 'budget_depleted');
    }
  }

  /**
   * Send budget alert notification
   */
  private static async sendBudgetAlert(
    campaignId: string,
    threshold: number
  ): Promise<void> {
    const campaign = await this.fetchCampaign(campaignId);
    if (!campaign) return;

    const percentage = Math.round(threshold * 100);
    
    console.log(
      `[BudgetManager] ALERT: Campaign ${campaignId} has used ${percentage}% of daily budget`
    );

    // TODO: Send email/notification to seller
    // const notificationService = await import('@/services/notifications');
    // await notificationService.send({
    //   userId: campaign.sellerId,
    //   type: 'ad_budget_alert',
    //   data: { campaignId, percentage },
    // });
  }

  /**
   * Pause campaign due to budget depletion
   */
  private static async pauseCampaign(
    campaignId: string,
    reason: 'budget_depleted' | 'manual'
  ): Promise<void> {
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();

    await db.collection('souq_ad_campaigns').updateOne(
      { campaignId },
      {
        $set: {
          status: 'paused',
          pauseReason: reason,
          pausedAt: new Date(),
        },
      }
    );

    console.log(`[BudgetManager] Paused campaign ${campaignId}: ${reason}`);

    // TODO: Send notification
  }

  /**
   * Get budget key for Redis
   */
  private static getBudgetKey(campaignId: string): string {
    const today = new Date().toISOString().split('T')[0];
    return `${this.REDIS_PREFIX}${campaignId}:${today}`;
  }

  /**
   * Fetch campaign from database
   */
  private static async fetchCampaign(campaignId: string): Promise<{
    campaignId: string;
    dailyBudget: number;
    status: string;
    sellerId: string;
  } | null> {
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();

    const campaign = await db
      .collection('souq_ad_campaigns')
      .findOne({ campaignId });

    return campaign as {
      campaignId: string;
      dailyBudget: number;
      status: string;
      sellerId: string;
    } | null;
  }

  /**
   * Get aggregated budget stats for all campaigns
   */
  static async getCampaignsBudgetSummary(sellerId: string): Promise<{
    totalDailyBudget: number;
    totalSpentToday: number;
    activeCampaigns: number;
    pausedCampaigns: number;
    campaigns: BudgetStatus[];
  }> {
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();

    const campaigns = await db
      .collection('souq_ad_campaigns')
      .find({ sellerId })
      .toArray();

    let totalDailyBudget = 0;
    let totalSpentToday = 0;
    let activeCampaigns = 0;
    let pausedCampaigns = 0;

    const budgetStatuses: BudgetStatus[] = [];

    for (const campaign of campaigns) {
      const status = await this.getBudgetStatus(campaign.campaignId);
      budgetStatuses.push(status);

      totalDailyBudget += status.dailyBudget;
      totalSpentToday += status.spentToday;

      if (status.isActive) {
        activeCampaigns++;
      } else if (campaign.status === 'paused') {
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
    newBudget: number
  ): Promise<void> {
    if (newBudget < 10) {
      throw new Error('Daily budget must be at least 10 SAR');
    }

    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();

    await db.collection('souq_ad_campaigns').updateOne(
      { campaignId },
      { $set: { dailyBudget: newBudget } }
    );

    console.log(`[BudgetManager] Updated budget for ${campaignId}: ${newBudget} SAR`);
  }

  /**
   * Get spend history (last 30 days)
   */
  static async getSpendHistory(campaignId: string, days: number = 30): Promise<{
    date: string;
    spend: number;
  }[]> {
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await db
      .collection('souq_ad_daily_spend')
      .find({
        campaignId,
        date: { $gte: startDate.toISOString().split('T')[0] },
      })
      .sort({ date: 1 })
      .toArray();

    return history.map(record => ({
      date: record.date,
      spend: record.spend,
    }));
  }
}
