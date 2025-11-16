/**
 * Souq Rating Aggregation Service - Calculates and caches ratings
 * @module services/souq/reviews/rating-aggregation-service
 */

import { SouqReview } from '@/server/models/souq/Review';
import { SouqProduct } from '@/server/models/souq/Product';

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
  private cache = new Map<string, { data: RatingAggregate; timestamp: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  private getCacheKey(productId: string, orgId?: string): string {
    return `${orgId ?? 'global'}:${productId}`;
  }

  /**
   * Calculate product rating with caching
   */
  async calculateProductRating(productId: string, orgId?: string): Promise<RatingAggregate> {
    // Check cache first
    const cacheKey = this.getCacheKey(productId, orgId);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // Fetch published reviews
    const reviewFilter: Record<string, unknown> = {
      productId,
      status: 'published',
    };
    if (orgId) {
      reviewFilter.org_id = orgId;
    }

    const reviews = await SouqReview.find(reviewFilter)
      .select('rating isVerifiedPurchase')
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
  async calculateSellerRating(orgId: string, sellerId: string): Promise<SellerRatingAggregate> {
    const products = await SouqProduct.find({ createdBy: sellerId }).select('_id').lean();
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

    // Fetch all reviews for seller's products
    const reviews = await SouqReview.find({
      org_id: orgId,
      productId: { $in: productIds },
      status: 'published',
    })
      .select('rating createdAt sellerResponse')
      .lean();

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    // Calculate response rate
    const reviewsWithResponse = reviews.filter((r) => r.sellerResponse).length;
    const responseRate = totalReviews > 0 ? (reviewsWithResponse / totalReviews) * 100 : 0;

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
  async updateProductRatingCache(productId: string, orgId?: string): Promise<void> {
    // Invalidate cache
    this.cache.delete(this.getCacheKey(productId, orgId));

    // Recalculate
    await this.calculateProductRating(productId, orgId);
  }

  /**
   * Get rating distribution with percentages
   */
  async getRatingDistribution(productId: string, orgId?: string): Promise<RatingDistribution> {
    const aggregate = await this.calculateProductRating(productId, orgId);
    const total = aggregate.totalReviews;

    const distribution: RatingDistribution = {
      5: {
        count: aggregate.distribution[5],
        percentage: total > 0 ? Math.round((aggregate.distribution[5] / total) * 100) : 0,
      },
      4: {
        count: aggregate.distribution[4],
        percentage: total > 0 ? Math.round((aggregate.distribution[4] / total) * 100) : 0,
      },
      3: {
        count: aggregate.distribution[3],
        percentage: total > 0 ? Math.round((aggregate.distribution[3] / total) * 100) : 0,
      },
      2: {
        count: aggregate.distribution[2],
        percentage: total > 0 ? Math.round((aggregate.distribution[2] / total) * 100) : 0,
      },
      1: {
        count: aggregate.distribution[1],
        percentage: total > 0 ? Math.round((aggregate.distribution[1] / total) * 100) : 0,
      },
    };

    return distribution;
  }

  /**
   * Get recent reviews for a product
   */
  async getRecentReviews(orgId: string, productId: string, limit: number = 5) {
    return await SouqReview.find({
      org_id: orgId,
      productId,
      status: 'published',
    })
      .sort({ createdAt: -1 })
      .limit(limit);
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
