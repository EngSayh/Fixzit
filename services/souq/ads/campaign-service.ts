// @ts-nocheck
/**
 * Ad Campaign Service
 * 
 * CRUD operations for advertising campaigns:
 * - Create campaigns (Sponsored Products, Sponsored Brands)
 * - Manage targeting (keywords, categories, products)
 * - Set bidding strategies (manual, automatic)
 * - Schedule campaigns
 * - Track performance metrics
 */

import { nanoid } from 'nanoid';

type KeywordMatchType = 'exact' | 'phrase' | 'broad';
type KeywordTargetInput = string | {
  value: string;
  matchType?: KeywordMatchType;
};

interface CreateCampaignInput {
  sellerId: string;
  name: string;
  type: 'sponsored_products' | 'sponsored_brands' | 'product_display';
  dailyBudget: number;
  startDate: Date;
  endDate?: Date;
  biddingStrategy: 'manual' | 'automatic';
  defaultBid?: number; // For automatic bidding
  targeting: CampaignTargeting;
  products: string[]; // FSINs to advertise
}

interface CampaignTargeting {
  type: 'keyword' | 'category' | 'product' | 'automatic';
  keywords?: KeywordTargetInput[]; // Keyword strings or structured values
  categories?: string[]; // For category targeting
  targetProducts?: string[]; // Competitor ASINs for product targeting
  products?: string[]; // Legacy alias for targetProducts
  matchType?: KeywordMatchType; // Legacy fallback when keywords array is string[]
}

interface UpdateCampaignInput {
  name?: string;
  dailyBudget?: number;
  startDate?: Date;
  endDate?: Date;
  status?: 'active' | 'paused' | 'ended';
  biddingStrategy?: 'manual' | 'automatic';
  defaultBid?: number;
}

interface Campaign {
  campaignId: string;
  sellerId: string;
  name: string;
  type: 'sponsored_products' | 'sponsored_brands' | 'product_display';
  status: 'active' | 'paused' | 'ended';
  dailyBudget: number;
  spentToday: number;
  startDate: Date;
  endDate?: Date;
  biddingStrategy: 'manual' | 'automatic';
  defaultBid?: number;
  targeting: CampaignTargeting;
  products: string[];
  bids: AdBid[];
  createdAt: Date;
  updatedAt: Date;
}

interface AdBid {
  bidId: string;
  campaignId: string;
  targetType: 'keyword' | 'category' | 'product' | 'asin';
  targetValue: string;
  bidAmount: number;
  productId: string;
  status: 'active' | 'paused';
  createdAt: Date;
  matchType?: KeywordMatchType;
}

export class CampaignService {
  /**
   * Create new ad campaign
   */
  static async createCampaign(input: CreateCampaignInput): Promise<Campaign> {
    // Validation
    if (input.dailyBudget < 10) {
      throw new Error('Daily budget must be at least 10 SAR');
    }

    if (input.products.length === 0) {
      throw new Error('At least one product must be selected');
    }

    if (input.biddingStrategy === 'automatic' && !input.defaultBid) {
      throw new Error('Default bid required for automatic bidding');
    }

    // Generate campaign ID
    const campaignId = `camp_${nanoid(12)}`;

    // Create bids based on targeting
    const bids = await this.generateBids(
      campaignId,
      input.targeting,
      input.products,
      input.biddingStrategy === 'automatic' ? input.defaultBid! : 0
    );

    const campaign: Campaign = {
      campaignId,
      sellerId: input.sellerId,
      name: input.name,
      type: input.type,
      status: 'active',
      dailyBudget: input.dailyBudget,
      spentToday: 0,
      startDate: input.startDate,
      endDate: input.endDate,
      biddingStrategy: input.biddingStrategy,
      defaultBid: input.defaultBid,
      targeting: input.targeting,
      products: input.products,
      bids,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to database
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();

    await db.collection('souq_ad_campaigns').insertOne(campaign);
    await db.collection('souq_ad_bids').insertMany(bids);

    console.log(`[CampaignService] Created campaign: ${campaignId}`);

    return campaign;
  }

  /**
   * Update campaign
   */
  static async updateCampaign(
    campaignId: string,
    updates: UpdateCampaignInput
  ): Promise<Campaign> {
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();

    const campaign = await db
      .collection('souq_ad_campaigns')
      .findOne({ campaignId });

    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    const updateDoc = {
      ...updates,
      updatedAt: new Date(),
    };

    await db.collection('souq_ad_campaigns').updateOne(
      { campaignId },
      { $set: updateDoc }
    );

    const updated = await db
      .collection('souq_ad_campaigns')
      .findOne({ campaignId });

    console.log(`[CampaignService] Updated campaign: ${campaignId}`);

    return updated as unknown as Campaign;
  }

  /**
   * Delete campaign
   */
  static async deleteCampaign(campaignId: string): Promise<void> {
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();

    // Delete bids
    await db.collection('souq_ad_bids').deleteMany({ campaignId });

    // Delete campaign
    await db.collection('souq_ad_campaigns').deleteOne({ campaignId });

    console.log(`[CampaignService] Deleted campaign: ${campaignId}`);
  }

  /**
   * Get campaign by ID
   */
  static async getCampaign(campaignId: string): Promise<Campaign | null> {
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();

    const campaign = await db
      .collection('souq_ad_campaigns')
      .findOne({ campaignId });

    if (!campaign) return null;

    // Fetch bids
    const bids = await db
      .collection('souq_ad_bids')
      .find({ campaignId })
      .toArray();

    return {
      ...campaign,
      bids,
    } as unknown as Campaign;
  }

  /**
   * List campaigns for seller
   */
  static async listCampaigns(
    sellerId: string,
    filters?: {
      status?: 'active' | 'paused' | 'ended';
      type?: 'sponsored_products' | 'sponsored_brands' | 'product_display';
    }
  ): Promise<Campaign[]> {
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();

    const query: Record<string, unknown> = { sellerId };
    
    if (filters?.status) query.status = filters.status;
    if (filters?.type) query.type = filters.type;

    const campaigns = await db
      .collection('souq_ad_campaigns')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Fetch bids for each campaign
    const campaignsWithBids = await Promise.all(
      campaigns.map(async (campaign) => {
        const bids = await db
          .collection('souq_ad_bids')
          .find({ campaignId: campaign.campaignId })
          .toArray();

        return {
          ...campaign,
          bids,
        } as unknown as Campaign;
      })
    );

    return campaignsWithBids;
  }

  /**
   * Get campaign performance stats
   */
  static async getCampaignStats(campaignId: string): Promise<{
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    revenue: number;
    ctr: number;
    avgCpc: number;
    acos: number; // Advertising Cost of Sales
    roas: number; // Return on Ad Spend
  }> {
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();

    // Aggregate stats from all bids in campaign
    const bids = await db
      .collection('souq_ad_bids')
      .find({ campaignId })
      .toArray();

    const bidIds = bids.map(b => b.bidId);

    const stats = await db
      .collection('souq_ad_stats')
      .find({ bidId: { $in: bidIds } })
      .toArray();

    const totals = stats.reduce(
      (acc, stat) => ({
        impressions: acc.impressions + (stat.impressions || 0),
        clicks: acc.clicks + (stat.clicks || 0),
        conversions: acc.conversions + (stat.conversions || 0),
        spend: acc.spend + (stat.spend || 0),
        revenue: acc.revenue + (stat.revenue || 0),
      }),
      { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 }
    );

    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const avgCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    const acos = totals.revenue > 0 ? (totals.spend / totals.revenue) * 100 : 0;
    const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;

    return {
      ...totals,
      ctr: Math.round(ctr * 100) / 100,
      avgCpc: Math.round(avgCpc * 100) / 100,
      acos: Math.round(acos * 100) / 100,
      roas: Math.round(roas * 100) / 100,
    };
  }

  /**
   * Update bid amount for specific target
   */
  static async updateBid(
    bidId: string,
    newBidAmount: number
  ): Promise<void> {
    if (newBidAmount < 0.05) {
      throw new Error('Bid amount must be at least 0.05 SAR');
    }

    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();

    await db.collection('souq_ad_bids').updateOne(
      { bidId },
      { $set: { bidAmount: newBidAmount } }
    );

    console.log(`[CampaignService] Updated bid ${bidId}: ${newBidAmount} SAR`);
  }

  /**
   * Pause/resume bid
   */
  static async toggleBid(bidId: string, status: 'active' | 'paused'): Promise<void> {
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();

    await db.collection('souq_ad_bids').updateOne(
      { bidId },
      { $set: { status } }
    );

    console.log(`[CampaignService] Bid ${bidId} status: ${status}`);
  }

  /**
   * Add new keyword to campaign
   */
  static async addKeyword(
    campaignId: string,
    keyword: string,
    bidAmount: number,
    productId: string,
    matchType: KeywordMatchType = 'broad'
  ): Promise<AdBid> {
    const bidId = `bid_${nanoid(12)}`;

    const bid: AdBid = {
      bidId,
      campaignId,
      targetType: 'keyword',
      targetValue: keyword.toLowerCase(),
      bidAmount,
      productId,
      status: 'active',
      createdAt: new Date(),
      matchType,
    };

    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();

    await db.collection('souq_ad_bids').insertOne(bid);

    console.log(`[CampaignService] Added keyword "${keyword}" to campaign ${campaignId}`);

    return bid;
  }

  /**
   * Generate bids based on targeting strategy
   */
  private static async generateBids(
    campaignId: string,
    targeting: CampaignTargeting,
    products: string[],
    defaultBid: number
  ): Promise<AdBid[]> {
    const bids: AdBid[] = [];

    if (targeting.type === 'keyword' && targeting.keywords?.length) {
      // Create bid for each keyword-product combination
      for (const keywordEntry of targeting.keywords) {
        const keywordValue = typeof keywordEntry === 'string'
          ? keywordEntry
          : keywordEntry.value;
        if (!keywordValue) continue;

        const normalizedKeyword = keywordValue.trim().toLowerCase();
        if (!normalizedKeyword) continue;

        const entryMatchType = typeof keywordEntry === 'string'
          ? undefined
          : keywordEntry.matchType;
        const matchType = entryMatchType ?? targeting.matchType ?? 'broad';

        for (const productId of products) {
          bids.push({
            bidId: `bid_${nanoid(12)}`,
            campaignId,
            targetType: 'keyword',
            targetValue: normalizedKeyword,
            matchType,
            bidAmount: defaultBid,
            productId,
            status: 'active',
            createdAt: new Date(),
          });
        }
      }
    } else if (targeting.type === 'category' && targeting.categories) {
      // Create bid for each category-product combination
      for (const category of targeting.categories) {
        for (const productId of products) {
          bids.push({
            bidId: `bid_${nanoid(12)}`,
            campaignId,
            targetType: 'category',
            targetValue: category,
            bidAmount: defaultBid,
            productId,
            status: 'active',
            createdAt: new Date(),
          });
        }
      }
    } else if (targeting.type === 'product') {
      // Product/ASIN targeting (for PDP ads)
      const targetProducts = targeting.targetProducts ?? targeting.products ?? [];

      for (const targetProductId of targetProducts) {
        const sanitizedTarget = targetProductId?.trim();
        if (!sanitizedTarget) continue;

        for (const productId of products) {
          bids.push({
            bidId: `bid_${nanoid(12)}`,
            campaignId,
            targetType: 'asin',
            targetValue: sanitizedTarget,
            bidAmount: defaultBid,
            productId,
            status: 'active',
            createdAt: new Date(),
          });
        }
      }
    } else if (targeting.type === 'automatic') {
      // Automatic targeting (match all relevant searches)
      // Generate bids for product's category and auto-discovered keywords
      const { getDatabase } = await import('@/lib/mongodb-unified');
      const db = await getDatabase();

      for (const productId of products) {
        const product = await db.collection('souq_products').findOne({ fsin: productId });
        
        if (product) {
          // Category bid
          bids.push({
            bidId: `bid_${nanoid(12)}`,
            campaignId,
            targetType: 'category',
            targetValue: product.category,
            bidAmount: defaultBid,
            productId,
            status: 'active',
            createdAt: new Date(),
          });

          // Brand keyword bid
          if (product.brand) {
            bids.push({
              bidId: `bid_${nanoid(12)}`,
              campaignId,
              targetType: 'keyword',
              targetValue: product.brand.toLowerCase(),
              matchType: 'phrase',
              bidAmount: defaultBid,
              productId,
              status: 'active',
              createdAt: new Date(),
            });
          }
        }
      }
    }

    return bids;
  }

  static async getPerformanceReport(params: {
    sellerId: string;
    campaignId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    timeseries: Array<{ date: string; impressions: number; clicks: number; conversions: number; spend: number }>;
    keywords: Array<{
      keyword: string;
      campaignName: string;
      impressions: number;
      clicks: number;
      ctr: number;
      avgCpc: number;
      spend: number;
      conversions: number;
      acos: number;
      roas: number;
    }>;
    products: Array<{
      productId: string;
      productName: string;
      campaignName: string;
      impressions: number;
      clicks: number;
      ctr: number;
      conversions: number;
      revenue: number;
      acos: number;
    }>;
  }> {
    const { getDatabase } = await import('@/lib/mongodb-unified');
    const db = await getDatabase();

    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 7);

    const parseDate = (value?: string, fallback?: Date) => {
      if (!value) return fallback ? new Date(fallback) : undefined;
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? (fallback ? new Date(fallback) : undefined) : parsed;
    };

    let start = parseDate(params.startDate, defaultStart) ?? defaultStart;
    let end = parseDate(params.endDate, now) ?? now;

    if (start > end) {
      const tmp = start;
      start = end;
      end = tmp;
    }

    const campaignQuery: Record<string, unknown> = { sellerId: params.sellerId };
    if (params.campaignId) {
      campaignQuery.campaignId = params.campaignId;
    }

    const campaigns = await db
      .collection('souq_ad_campaigns')
      .find(campaignQuery)
      .toArray();

    if (campaigns.length === 0) {
      return { timeseries: [], keywords: [], products: [] };
    }

    const campaignIds = campaigns.map(c => c.campaignId);
    const campaignNameMap = new Map(campaigns.map(c => [c.campaignId, c.name]));

    const bids = await db
      .collection('souq_ad_bids')
      .find({ campaignId: { $in: campaignIds } })
      .toArray();

    if (bids.length === 0) {
      return { timeseries: [], keywords: [], products: [] };
    }

    const bidIds = bids.map(b => b.bidId);
    const stats = await db
      .collection('souq_ad_stats')
      .find({ bidId: { $in: bidIds } })
      .toArray();

    const statsMap = new Map(stats.map(stat => [stat.bidId, stat]));

    const keywordData = bids
      .filter(bid => bid.targetType === 'keyword')
      .map(bid => {
        const stat = statsMap.get(bid.bidId) || {};
        const impressions = stat.impressions || 0;
        const clicks = stat.clicks || 0;
        const spend = stat.spend || 0;
        const conversions = stat.conversions || 0;
        const revenue = stat.revenue || 0;
        return {
          keyword: bid.targetValue,
          campaignName: campaignNameMap.get(bid.campaignId) || bid.campaignId,
          impressions,
          clicks,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          avgCpc: clicks > 0 ? spend / clicks : 0,
          spend,
          conversions,
          acos: revenue > 0 ? (spend / revenue) * 100 : 0,
          roas: spend > 0 ? revenue / spend : 0,
        };
      })
      .sort((a, b) => b.impressions - a.impressions);

    const productBids = bids.filter(bid => bid.targetType === 'product' || bid.targetType === 'asin');
    const productFsins = Array.from(new Set(productBids.map(b => b.productId).filter(Boolean)));

    let productNameMap: Map<string, string> = new Map();
    if (productFsins.length > 0) {
      const products = await db
        .collection('souq_products')
        .find(
          { fsin: { $in: productFsins } },
          { projection: { fsin: 1, title: 1, name: 1 } }
        )
        .toArray();
      productNameMap = new Map(
        products.map(product => [product.fsin, product.title || product.name || product.fsin])
      );
    }

    const productData = productBids
      .map(bid => {
        const stat = statsMap.get(bid.bidId) || {};
        const impressions = stat.impressions || 0;
        const clicks = stat.clicks || 0;
        const conversions = stat.conversions || 0;
        const revenue = stat.revenue || 0;
        const spend = stat.spend || 0;
        return {
          productId: bid.productId,
          productName: productNameMap.get(bid.productId) || bid.productId,
          campaignName: campaignNameMap.get(bid.campaignId) || bid.campaignId,
          impressions,
          clicks,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          conversions,
          revenue,
          acos: revenue > 0 ? (spend / revenue) * 100 : 0,
        };
      })
      .sort((a, b) => b.impressions - a.impressions);

    const match: Record<string, unknown> = {
      campaignId: { $in: campaignIds },
      timestamp: {
        $gte: start,
        $lte: end,
      },
    };

    const timeseries = await db
      .collection('souq_ad_events')
      .aggregate([
        { $match: match },
        {
          $project: {
            eventType: 1,
            cpc: 1,
            day: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$timestamp',
                timezone: 'UTC',
              },
            },
          },
        },
        {
          $group: {
            _id: { day: '$day', type: '$eventType' },
            count: { $sum: 1 },
            spend: {
              $sum: {
                $cond: [{ $eq: ['$eventType', 'click'] }, '$cpc', 0],
              },
            },
          },
        },
        {
          $group: {
            _id: '$_id.day',
            impressions: {
              $sum: {
                $cond: [{ $eq: ['$_id.type', 'impression'] }, '$count', 0],
              },
            },
            clicks: {
              $sum: {
                $cond: [{ $eq: ['$_id.type', 'click'] }, '$count', 0],
              },
            },
            conversions: {
              $sum: {
                $cond: [{ $eq: ['$_id.type', 'conversion'] }, '$count', 0],
              },
            },
            spend: {
              $sum: {
                $cond: [{ $eq: ['$_id.type', 'click'] }, '$spend', 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            date: '$_id',
            impressions: 1,
            clicks: 1,
            conversions: 1,
            spend: 1,
          },
        },
      ])
      .toArray();

    return {
      timeseries,
      keywords: keywordData,
      products: productData,
    };
  }
}
