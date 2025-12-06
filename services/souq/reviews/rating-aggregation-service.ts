/**
 * Souq Rating Aggregation Service - Calculates and caches ratings
 * @module services/souq/reviews/rating-aggregation-service
 */

import { SouqReview, type IReview } from "@/server/models/souq/Review";
import { SouqProduct, type IProduct } from "@/server/models/souq/Product";
import { Types, type FilterQuery } from "mongoose";
import { buildSouqOrgFilter } from "@/services/souq/org-scope";

// 🔐 STRICT v4.1: Type-safe org filter helpers
const getReviewOrgFilter = (orgId: string): FilterQuery<IReview> =>
  buildSouqOrgFilter(orgId) as FilterQuery<IReview>;
const getProductOrgFilter = (orgId: string): FilterQuery<IProduct> =>
  buildSouqOrgFilter(orgId) as FilterQuery<IProduct>;

export interface RatingAggregate {
  averageRating: number;
  totalReviews: number;
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  verifiedPurchasePercentage: number;
  lastUpdated: Date;
}

export interface SellerRatingAggregate {
  averageRating: number;
  totalReviews: number;
  responseRate: number;
  last30Days: {
    averageRating: number;
    totalReviews: number;
  };
}

export interface RatingDistribution {
  5: { count: number; percentage: number };
  4: { count: number; percentage: number };
  3: { count: number; percentage: number };
  2: { count: number; percentage: number };
  1: { count: number; percentage: number };
}

class RatingAggregationService {
  // In-memory cache (in production, use Redis)
  private cache = new Map<
    string,
    { data: RatingAggregate; timestamp: number }
  >();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  private getCacheKey(productId: string, orgId: string): string {
    return `${orgId}:${productId}`;
  }

  /**
   * Calculate product rating with caching
   */
  async calculateProductRating(
    productId: string,
    orgId: string,
  ): Promise<RatingAggregate> {
    if (!orgId) {
      throw new Error("orgId is required for tenant-scoped product rating");
    }
    // Check cache first
    const cacheKey = this.getCacheKey(productId, orgId);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // 🔐 STRICT v4.1: Use shared org filter helper for consistent tenant isolation
    const orgFilter = getReviewOrgFilter(orgId);
    const reviewFilter: FilterQuery<IReview> = {
      productId: Types.ObjectId.isValid(productId) ? new Types.ObjectId(productId) : productId,
      status: "published",
      ...orgFilter,
    };

    const reviews = await SouqReview.find(reviewFilter)
      .select("rating isVerifiedPurchase")
      .lean();

    const totalReviews = reviews.length;
    const verifiedCount = reviews.filter((r) => r.isVerifiedPurchase).length;

    // Calculate weighted average (verified purchases count more)
    let weightedSum = 0;
    let totalWeight = 0;

    reviews.forEach((review) => {
      const weight = review.isVerifiedPurchase ? 1.5 : 1.0;
      weightedSum += review.rating * weight;
      totalWeight += weight;
    });

    const averageRating = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Calculate distribution
    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    reviews.forEach((review) => {
      const rating = review.rating as 1 | 2 | 3 | 4 | 5;
      distribution[rating] += 1;
    });

    const verifiedPurchasePercentage =
      totalReviews > 0 ? (verifiedCount / totalReviews) * 100 : 0;

    const aggregate: RatingAggregate = {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews,
      distribution,
      verifiedPurchasePercentage: Math.round(verifiedPurchasePercentage),
      lastUpdated: new Date(),
    };

    // Cache result
    this.cache.set(cacheKey, {
      data: aggregate,
      timestamp: Date.now(),
    });

    return aggregate;
  }

  /**
   * Calculate seller rating across all products
   */
  async calculateSellerRating(
    orgId: string,
    sellerId: string,
  ): Promise<SellerRatingAggregate> {
    // 🔐 STRICT v4.1: Use shared org filter helper for consistent tenant isolation
    const orgFilter = getProductOrgFilter(orgId);
    const sellerObjectId = Types.ObjectId.isValid(sellerId)
      ? new Types.ObjectId(sellerId)
      : sellerId;

    const products = await SouqProduct.find({ createdBy: sellerObjectId, ...orgFilter })
      .select("_id")
      .lean();
    if (products.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        responseRate: 0,
        last30Days: {
          averageRating: 0,
          totalReviews: 0,
        },
      };
    }
    const productIds = products.map((p) => p._id);

    // 🔐 STRICT v4.1: Use shared org filter helper for consistent tenant isolation
    const reviewOrgFilter = getReviewOrgFilter(orgId);
    const reviews = await SouqReview.find({
      ...reviewOrgFilter,
      productId: { $in: productIds },
      status: "published",
    })
      .select("rating createdAt sellerResponse")
      .lean();

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    // Calculate response rate
    const reviewsWithResponse = reviews.filter((r) => r.sellerResponse).length;
    const responseRate =
      totalReviews > 0 ? (reviewsWithResponse / totalReviews) * 100 : 0;

    // Last 30 days stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentReviews = reviews.filter((r) => r.createdAt >= thirtyDaysAgo);
    const recentTotal = recentReviews.length;
    const recentAverage =
      recentTotal > 0
        ? recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentTotal
        : 0;

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      responseRate: Math.round(responseRate),
      last30Days: {
        averageRating: Math.round(recentAverage * 10) / 10,
        totalReviews: recentTotal,
      },
    };
  }

  /**
   * Update product rating cache (called after new review)
   */
  async updateProductRatingCache(
    productId: string,
    orgId: string,
  ): Promise<void> {
    if (!orgId) {
      throw new Error("orgId is required to update product rating cache");
    }
    // Invalidate cache
    this.cache.delete(this.getCacheKey(productId, orgId));

    // Recalculate
    await this.calculateProductRating(productId, orgId);
  }

  /**
   * Get rating distribution with percentages
   */
  async getRatingDistribution(
    productId: string,
    orgId: string,
  ): Promise<RatingDistribution> {
    if (!orgId) {
      throw new Error("orgId is required to fetch rating distribution");
    }
    const aggregate = await this.calculateProductRating(productId, orgId);
    const total = aggregate.totalReviews;

    const distribution: RatingDistribution = {
      5: {
        count: aggregate.distribution[5],
        percentage:
          total > 0 ? Math.round((aggregate.distribution[5] / total) * 100) : 0,
      },
      4: {
        count: aggregate.distribution[4],
        percentage:
          total > 0 ? Math.round((aggregate.distribution[4] / total) * 100) : 0,
      },
      3: {
        count: aggregate.distribution[3],
        percentage:
          total > 0 ? Math.round((aggregate.distribution[3] / total) * 100) : 0,
      },
      2: {
        count: aggregate.distribution[2],
        percentage:
          total > 0 ? Math.round((aggregate.distribution[2] / total) * 100) : 0,
      },
      1: {
        count: aggregate.distribution[1],
        percentage:
          total > 0 ? Math.round((aggregate.distribution[1] / total) * 100) : 0,
      },
    };

    return distribution;
  }

  /**
   * Get recent reviews for a product
   */
  async getRecentReviews(orgId: string, productId: string, limit: number = 5) {
    // 🔐 STRICT v4.1: Use shared org filter helper for consistent tenant isolation
    const orgFilter = getReviewOrgFilter(orgId);
    const MAX_LIMIT = 100; // Prevent unbounded queries
    const safeLimit = Math.min(limit, MAX_LIMIT);
    
    return await SouqReview.find({
      ...orgFilter,
      productId: Types.ObjectId.isValid(productId) ? new Types.ObjectId(productId) : productId,
      status: "published",
    })
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean();
  }

  /**
   * Clear cache for specific product
   */
  clearCache(orgId: string, productId: string): void {
    this.cache.delete(this.getCacheKey(orgId, productId));
  }

  /**
   * Clear all cached ratings
   */
  clearAllCache(): void {
    this.cache.clear();
  }
}

export const ratingAggregationService = new RatingAggregationService();
