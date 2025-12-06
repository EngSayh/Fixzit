/**
 * CPC Auction Engine
 *
 * Implements second-price auction (Vickrey auction) for sponsored products.
 * Winner pays the second-highest bid + $0.01, up to their max bid.
 *
 * Quality Score = CTR (historical) * Relevance Score (0-1)
 * Ad Rank = Bid * Quality Score
 *
 * Auction Types:
 * - Sponsored Products (search results)
 * - Sponsored Brands (banner ads)
 * - Product Display Ads (PDP sidebar)
 */

interface AdCampaign {
  campaignId: string;
  orgId: string; // Required for tenant isolation (STRICT v4.1)
  sellerId: string;
  type: "sponsored_products" | "sponsored_brands" | "product_display";
  status: "active" | "paused" | "ended";
  dailyBudget: number;
  spentToday: number;
  bids?: AdBid[];
}

interface AdBid {
  bidId: string;
  campaignId: string;
  orgId: string; // Required for tenant isolation (STRICT v4.1)
  targetType: "keyword" | "category" | "product" | "asin";
  targetValue: string; // keyword text, category ID, or product FSIN
  bidAmount: number; // Max CPC bid
  productId: string; // FSIN of advertised product
  status: "active" | "paused";
  matchType?: "exact" | "phrase" | "broad";
}

interface AdCandidate {
  bid: AdBid;
  campaign: AdCampaign;
  qualityScore: number;
  adRank: number;
  relevanceScore: number;
}

export interface AuctionWinner {
  bid: AdBid;
  campaign: AdCampaign;
  adRank: number;
  actualCpc: number; // Amount to charge per click (second-price)
  productId: string;
  sellerId: string;
  bidId?: string;
  campaignId?: string;
  product?: {
    title: string;
    imageUrl?: string;
    price: number;
    originalPrice?: number;
    rating?: number;
    totalReviews?: number;
    badges?: string[];
    brand?: string;
    inStock?: boolean;
  };
}

interface AuctionContext {
  orgId: string; // Required for tenant isolation (STRICT v4.1)
  query?: string; // Search query
  category?: string; // Category ID
  productId?: string; // Product FSIN (for PDP ads)
  userContext?: {
    recentSearches: string[];
    recentViews: string[];
  };
}

export class AuctionEngine {
  /**
   * Run auction for search results (Sponsored Products)
   * Returns winning ads to display
   */
  static async runSearchAuction(
    context: AuctionContext,
    numSlots: number = 3,
  ): Promise<AuctionWinner[]> {
    // Fetch eligible campaigns
    const campaigns = await this.fetchEligibleCampaigns(
      "sponsored_products",
      context,
    );

    if (campaigns.length === 0) return [];

    // Build candidate list
    const candidates: AdCandidate[] = [];

    for (const campaign of campaigns) {
      // Check budget
      if (campaign.spentToday >= campaign.dailyBudget) continue;

      // Always read the latest bids from the canonical collection
      const campaignBids = await this.fetchCampaignBids(
        campaign.campaignId,
        context.orgId,
      );
      if (campaignBids.length === 0) continue;

      // Get matching bids for this search
      const matchingBids = this.getMatchingBids(campaignBids, context);

      for (const bid of matchingBids) {
        const qualityScore = await this.calculateQualityScore(bid, context);
        const relevanceScore = this.calculateRelevanceScore(bid, context);
        const adRank = bid.bidAmount * qualityScore;

        candidates.push({
          bid,
          campaign,
          qualityScore,
          adRank,
          relevanceScore,
        });
      }
    }

    // Sort by ad rank (descending)
    candidates.sort((a, b) => b.adRank - a.adRank);

    // Select winners and calculate CPC (second-price auction)
    const winners: AuctionWinner[] = [];

    for (let i = 0; i < Math.min(numSlots, candidates.length); i++) {
      const winner = candidates[i];
      const nextBid = candidates[i + 1];

      // Second-price: winner pays next highest bid / winner's quality score + $0.01
      // Capped at winner's max bid
      let actualCpc = winner.bid.bidAmount; // Default to max bid

      if (nextBid) {
        const secondPrice = nextBid.adRank / winner.qualityScore + 0.01;
        actualCpc = Math.min(secondPrice, winner.bid.bidAmount);
      }

      winners.push({
        bid: winner.bid,
        campaign: winner.campaign,
        adRank: winner.adRank,
        actualCpc: Math.round(actualCpc * 100) / 100, // Round to 2 decimals
        productId: winner.bid.productId,
        sellerId: winner.campaign.sellerId,
        bidId: winner.bid.bidId,
        campaignId: winner.campaign.campaignId,
      });
    }

    return winners;
  }

  /**
   * Run auction for product display ads (PDP sidebar)
   */
  static async runProductDisplayAuction(
    context: AuctionContext,
    numSlots: number = 2,
  ): Promise<AuctionWinner[]> {
    const campaigns = await this.fetchEligibleCampaigns(
      "product_display",
      context,
    );

    if (campaigns.length === 0) return [];

    const candidates: AdCandidate[] = [];

    for (const campaign of campaigns) {
      if (campaign.spentToday >= campaign.dailyBudget) continue;

      const campaignBids = await this.fetchCampaignBids(
        campaign.campaignId,
        context.orgId,
      );
      if (campaignBids.length === 0) continue;

      const matchingBids = this.getMatchingBids(campaignBids, context);

      for (const bid of matchingBids) {
        // For PDP ads, quality score is based on product similarity + CTR
        const qualityScore = await this.calculateQualityScore(bid, context);
        const relevanceScore = this.calculateRelevanceScore(bid, context);
        const adRank = bid.bidAmount * qualityScore;

        candidates.push({
          bid,
          campaign,
          qualityScore,
          adRank,
          relevanceScore,
        });
      }
    }

    candidates.sort((a, b) => b.adRank - a.adRank);

    const winners: AuctionWinner[] = [];

    for (let i = 0; i < Math.min(numSlots, candidates.length); i++) {
      const winner = candidates[i];
      const nextBid = candidates[i + 1];

      let actualCpc = winner.bid.bidAmount;

      if (nextBid) {
        const secondPrice = nextBid.adRank / winner.qualityScore + 0.01;
        actualCpc = Math.min(secondPrice, winner.bid.bidAmount);
      }

      winners.push({
        bid: winner.bid,
        campaign: winner.campaign,
        adRank: winner.adRank,
        actualCpc: Math.round(actualCpc * 100) / 100,
        productId: winner.bid.productId,
        sellerId: winner.campaign.sellerId,
        bidId: winner.bid.bidId,
        campaignId: winner.campaign.campaignId,
      });
    }

    return winners;
  }

  /**
   * Calculate Quality Score (0-10)
   * Quality Score = CTR * Relevance * Landing Page Quality
   *
   * Factors:
   * - Historical CTR (click-through rate)
   * - Ad relevance to query
   * - Landing page quality (product rating, reviews)
   */
  private static async calculateQualityScore(
    bid: AdBid,
    context: AuctionContext,
  ): Promise<number> {
    // Fetch historical performance
    const stats = await this.fetchBidStats(bid.bidId);

    // CTR component (0-1)
    const ctr =
      stats.impressions > 100 ? stats.clicks / stats.impressions : 0.05; // Default CTR for new ads

    // Normalize CTR to 0-1 scale (assume 0.5% = 1.0, 5% = 10.0)
    const ctrScore = Math.min(ctr * 200, 10);

    // Relevance component (0-1)
    const relevanceScore = this.calculateRelevanceScore(bid, context);

    // Landing page quality (0-1)
    const lpqScore = await this.calculateLandingPageQuality(bid.productId);

    // Normalize relevance/lpq to the same 0-10 scale before weighting so CTR
    // does not dominate simply because of scale differences.
    const normalizedRelevance = relevanceScore * 10;
    const normalizedLpq = lpqScore * 10;

    const qualityScore =
      ctrScore * 0.5 + normalizedRelevance * 0.3 + normalizedLpq * 0.2;

    return Math.max(0.1, Math.min(10, qualityScore)); // Clamp to 0.1-10
  }

  /**
   * Calculate Relevance Score (0-1)
   * How well the ad matches the search query or context
   */
  private static calculateRelevanceScore(
    bid: AdBid,
    context: AuctionContext,
  ): number {
    if (bid.targetType === "keyword" && context.query) {
      return this.calculateKeywordRelevance(bid, context.query);
    }

    if (bid.targetType === "category" && context.category) {
      return bid.targetValue === context.category ? 1.0 : 0.3;
    }

    if (
      (bid.targetType === "product" || bid.targetType === "asin") &&
      context.productId
    ) {
      return bid.targetValue === context.productId ? 1.0 : 0.5;
    }

    // Default relevance for broad match
    return 0.5;
  }

  /**
   * Calculate Landing Page Quality (0-1)
   * Based on product rating, reviews, conversion rate
   */
  private static async calculateLandingPageQuality(
    productId: string,
  ): Promise<number> {
    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    const product = await db
      .collection("souq_products")
      .findOne({ fsin: productId });

    if (!product) return 0.5; // Default quality

    const rating = product.rating || 0;
    const totalReviews = product.totalReviews || 0;

    // Rating score (0-1)
    const ratingScore = rating / 5;

    // Reviews score (more reviews = higher confidence)
    const reviewScore = Math.min(totalReviews / 100, 1);

    // Weighted average
    return ratingScore * 0.7 + reviewScore * 0.3;
  }

  /**
   * Get bids that match the auction context
   */
  private static getMatchingBids(
    bids: AdBid[],
    context: AuctionContext,
  ): AdBid[] {
    const query = context.query?.trim();

    return bids.filter((bid) => {
      if (bid.status !== "active") return false;

      if (bid.targetType === "keyword" && query) {
        return this.keywordMatches(bid.targetValue, bid.matchType, query);
      }

      if (bid.targetType === "category" && context.category) {
        return bid.targetValue === context.category;
      }

      if (
        (bid.targetType === "product" || bid.targetType === "asin") &&
        context.productId
      ) {
        return bid.targetValue === context.productId;
      }

      return false;
    });
  }

  /**
   * Determine whether a keyword bid matches the current query based on match type
   */
  private static keywordMatches(
    keyword: string,
    matchType: AdBid["matchType"],
    query: string,
  ): boolean {
    const stats = this.getKeywordMatchStats(keyword, query);
    const type = matchType ?? "broad";

    switch (type) {
      case "exact":
        return stats.exact;
      case "phrase":
        return stats.exact || stats.includes;
      case "broad":
      default:
        return stats.exact || stats.includes || stats.overlapRatio > 0;
    }
  }

  /**
   * Calculate relevance for keyword bids with match-type awareness
   */
  private static calculateKeywordRelevance(bid: AdBid, query: string): number {
    const stats = this.getKeywordMatchStats(bid.targetValue, query);
    const matchType = bid.matchType ?? "broad";

    switch (matchType) {
      case "exact":
        return stats.exact ? 1 : 0;
      case "phrase":
        if (stats.exact) return 1;
        if (stats.includes) return 0.9;
        return Math.min(0.8, stats.overlapRatio * 0.8);
      case "broad":
      default:
        if (stats.exact) return 1;
        if (stats.includes) {
          return Math.min(0.9, 0.6 + stats.overlapRatio * 0.3);
        }
        return stats.overlapRatio;
    }
  }

  private static getKeywordMatchStats(
    keyword: string,
    rawQuery: string,
  ): {
    exact: boolean;
    includes: boolean;
    overlapRatio: number;
  } {
    const query = rawQuery.toLowerCase();
    const normalizedKeyword = keyword.toLowerCase();

    const queryWords = query.split(/\s+/).filter(Boolean);
    const keywordWords = normalizedKeyword.split(/\s+/).filter(Boolean);
    const overlap = keywordWords.filter((word) =>
      queryWords.includes(word),
    ).length;
    const maxWords = Math.max(keywordWords.length, queryWords.length);

    return {
      exact: query === normalizedKeyword,
      includes: query.includes(normalizedKeyword),
      overlapRatio: maxWords === 0 ? 0 : overlap / maxWords,
    };
  }

  /**
   * Fetch the most recent bids for a campaign from the canonical collection
   */
  private static async fetchCampaignBids(
    campaignId: string,
    orgId: string,
  ): Promise<AdBid[]> {
    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    const bids = await db
      .collection<AdBid>("souq_ad_bids")
      .find({ campaignId, orgId }) // Tenant isolation (STRICT v4.1)
      .toArray();

    return bids;
  }

  /**
   * Fetch eligible campaigns from database
   * SECURITY: Must be scoped by orgId for tenant isolation (STRICT v4.1)
   */
  private static async fetchEligibleCampaigns(
    type: "sponsored_products" | "sponsored_brands" | "product_display",
    context: AuctionContext,
  ): Promise<AdCampaign[]> {
    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    // CRITICAL: Always filter by orgId to prevent cross-tenant ad serving
    const campaigns = await db
      .collection<AdCampaign>("souq_campaigns")
      .find({
        orgId: context.orgId, // Required for tenant isolation
        type,
        status: "active",
        $expr: { $lt: ["$spentToday", "$dailyBudget"] },
      })
      .toArray();

    return campaigns;
  }

  /**
   * Fetch bid performance statistics
   */
  private static async fetchBidStats(bidId: string): Promise<{
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
  }> {
    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    const stats = await db.collection("souq_ad_stats").findOne({ bidId });

    return {
      impressions: stats?.impressions || 0,
      clicks: stats?.clicks || 0,
      conversions: stats?.conversions || 0,
      spend: stats?.spend || 0,
    };
  }

  /**
   * Record impression (ad was shown)
   */
  static async recordImpression(
    bidId: string,
    campaignId: string,
    context: AuctionContext,
  ): Promise<void> {
    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    await db.collection("souq_ad_events").insertOne({
      eventType: "impression",
      orgId: context.orgId, // Required for tenant isolation
      bidId,
      campaignId,
      timestamp: new Date(),
      context: {
        query: context.query,
        category: context.category,
        productId: context.productId,
      },
    });

    // Update aggregated stats (scoped by bidId which is unique per campaign)
    await db.collection("souq_ad_stats").updateOne(
      { bidId },
      {
        $inc: { impressions: 1 },
        $setOnInsert: { clicks: 0, conversions: 0, spend: 0, orgId: context.orgId },
      },
      { upsert: true },
    );
  }

  /**
   * Record click (user clicked ad)
   */
  static async recordClick(
    bidId: string,
    campaignId: string,
    actualCpc: number,
    context: AuctionContext,
  ): Promise<void> {
    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    await db.collection("souq_ad_events").insertOne({
      eventType: "click",
      orgId: context.orgId, // Required for tenant isolation
      bidId,
      campaignId,
      cpc: actualCpc,
      timestamp: new Date(),
      context: {
        query: context.query,
        category: context.category,
        productId: context.productId,
      },
    });

    // Update aggregated stats (scoped by bidId which is unique per campaign)
    await db.collection("souq_ad_stats").updateOne(
      { bidId },
      {
        $inc: {
          clicks: 1,
          spend: actualCpc,
        },
        $setOnInsert: { orgId: context.orgId },
      },
      { upsert: true },
    );

    // Update campaign spend
    await db.collection("souq_campaigns").updateOne(
      { campaignId },
      {
        $inc: { spentToday: actualCpc },
      },
    );
  }

  /**
   * Record conversion (user purchased)
   */
  static async recordConversion(
    bidId: string,
    campaignId: string,
    orderValue: number,
  ): Promise<void> {
    const { getDatabase } = await import("@/lib/mongodb-unified");
    const db = await getDatabase();

    await db.collection("souq_ad_events").insertOne({
      eventType: "conversion",
      bidId,
      campaignId,
      orderValue,
      timestamp: new Date(),
    });

    // Update aggregated stats
    await db.collection("souq_ad_stats").updateOne(
      { bidId },
      {
        $inc: {
          conversions: 1,
          revenue: orderValue,
        },
      },
      { upsert: true },
    );
  }
}
