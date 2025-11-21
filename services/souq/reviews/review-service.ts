/**
 * Souq Review Service - Handles review operations
 * @module services/souq/reviews/review-service
 */

import { SouqReview, type IReview } from '@/server/models/souq/Review';
import { SouqOrder } from '@/server/models/souq/Order';
import { SouqProduct } from '@/server/models/souq/Product';
import { nanoid } from 'nanoid';
import type mongoose from 'mongoose';
import { Types } from 'mongoose';

export interface CreateReviewDto {
  productId: string;
  customerId: string;
  customerName: string;
  orderId?: string;
  rating: number;
  title: string;
  content: string;
  pros?: string[];
  cons?: string[];
  images?: Array<{ url: string; caption?: string }>;
}

export interface UpdateReviewDto {
  title?: string;
  content?: string;
  pros?: string[];
  cons?: string[];
  images?: Array<{ url: string; caption?: string }>;
}

export interface ReviewFilters {
  rating?: number;
  verifiedOnly?: boolean;
  sortBy?: 'recent' | 'helpful' | 'rating';
  page?: number;
  limit?: number;
  status?: 'pending' | 'published' | 'rejected' | 'flagged';
}

export interface PaginatedReviews {
  reviews: IReview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  verifiedPurchaseCount: number;
  recentReviews: IReview[];
}

export interface SellerReviewStats {
  averageRating: number;
  totalReviews: number;
  pendingResponses: number;
  responseRate: number;
  recentReviews: IReview[];
}

class ReviewService {
  /**
   * Submit a new review
   */
  async submitReview(orgId: string, data: CreateReviewDto): Promise<IReview> {
    this.assertRatingRange(data.rating);

    const orgObjectId = this.ensureObjectId(orgId, 'orgId');
    const productObjectId = this.ensureObjectId(data.productId, 'productId');
    const customerObjectId = this.ensureObjectId(data.customerId, 'customerId');

    const product = await SouqProduct.findById(productObjectId).select('fsin isActive');
    if (!product) {
      throw new Error('Product not found');
    }
    if (product.isActive === false) {
      throw new Error('Cannot review inactive product');
    }

    // Check for duplicate review
    const existingReview = await SouqReview.findOne({
      customerId: customerObjectId,
      productId: productObjectId,
      org_id: orgObjectId,
    });

    if (existingReview) {
      throw new Error('You have already reviewed this product');
    }

    // Verify purchase if orderId provided
    let isVerifiedPurchase = false;
    let orderIdObj: mongoose.Types.ObjectId | undefined;

    if (data.orderId) {
      const order = await SouqOrder.findOne({
        orderId: data.orderId,
        customerId: customerObjectId,
        orgId: orgObjectId,
        'items.productId': productObjectId,
        status: 'delivered',
      });

      if (order) {
        isVerifiedPurchase = true;
        orderIdObj = order._id;
      }
    }

    // Create review
    const review = await SouqReview.create({
      reviewId: `REV-${nanoid(10)}`,
      org_id: orgObjectId,
      productId: productObjectId,
      fsin: product.fsin,
      customerId: customerObjectId,
      customerName: data.customerName,
      isVerifiedPurchase,
      orderId: orderIdObj,
      rating: data.rating,
      title: data.title,
      content: data.content,
      pros: data.pros || [],
      cons: data.cons || [],
      images: data.images || [],
      status: 'pending', // Requires moderation
    });

    return review;
  }

  /**
   * Update existing review (customer only)
   */
  async updateReview(
    reviewId: string,
    customerId: string,
    data: UpdateReviewDto
  ): Promise<IReview> {
    const review = await SouqReview.findOne({ reviewId, customerId });

    if (!review) {
      throw new Error('Review not found or unauthorized');
    }

    if (review.status === 'published') {
      throw new Error('Cannot edit published reviews');
    }

    // Update fields
    if (data.title) review.title = data.title;
    if (data.content) review.content = data.content;
    if (data.pros) review.pros = data.pros;
    if (data.cons) review.cons = data.cons;
    if (data.images) {
      review.images = data.images.map(img => ({
        ...img,
        uploadedAt: new Date(),
      }));
    }

    await review.save();
    return review;
  }

  /**
   * Delete review (customer only, before publication)
   */
  async deleteReview(reviewId: string, customerId: string): Promise<void> {
    const review = await SouqReview.findOne({ reviewId, customerId });

    if (!review) {
      throw new Error('Review not found or unauthorized');
    }

    if (review.status === 'published') {
      throw new Error('Cannot delete published reviews');
    }

    await review.deleteOne();
  }

  /**
   * Mark review as helpful
   */
  async markHelpful(reviewId: string, _customerId: string): Promise<IReview> {
    const review = await SouqReview.findOne({ reviewId });

    if (!review) {
      throw new Error('Review not found');
    }
    if (review.status !== 'published') {
      throw new Error('Cannot vote on unpublished reviews');
    }

    // Increment helpful count (in production, track who voted to prevent duplicates)
    review.helpful += 1;
    await review.save();

    return review;
  }

  /**
   * Mark review as not helpful
   */
  async markNotHelpful(reviewId: string, _customerId: string): Promise<IReview> {
    const review = await SouqReview.findOne({ reviewId });

    if (!review) {
      throw new Error('Review not found');
    }
    if (review.status !== 'published') {
      throw new Error('Cannot vote on unpublished reviews');
    }

    // Increment not helpful count
    review.notHelpful += 1;
    await review.save();

    return review;
  }

  /**
   * Report inappropriate review
   */
  async reportReview(reviewId: string, reason: string): Promise<IReview> {
    const review = await SouqReview.findOne({ reviewId });

    if (!review) {
      throw new Error('Review not found');
    }

    // Increment report count
    review.reportedCount += 1;
    review.reportReasons = review.reportReasons || [];
    review.reportReasons.push(reason);

    // Auto-flag if reported multiple times
    if (review.reportedCount >= 3 && review.status === 'published') {
      review.status = 'flagged';
    }

    await review.save();
    return review;
  }

  /**
   * Seller responds to review
   */
  async respondToReview(
    reviewId: string,
    sellerId: string,
    content: string
  ): Promise<IReview> {
    const review = await SouqReview.findOne({ reviewId });

    if (!review) {
      throw new Error('Review not found');
    }

    if (review.status !== 'published') {
      throw new Error('Can only respond to published reviews');
    }

    const product = await SouqProduct.findById(review.productId).select('createdBy');
    if (!Types.ObjectId.isValid(sellerId)) {
      throw new Error('Invalid seller id');
    }
    const ownerId =
      typeof product?.createdBy === 'string'
        ? product.createdBy
        : product?.createdBy?.toString?.();

    if (!product || ownerId !== sellerId) {
      throw new Error('Unauthorized to respond to this review');
    }

    // Set seller response
    review.sellerResponse = {
      content,
      respondedAt: new Date(),
      respondedBy: new Types.ObjectId(sellerId),
    };

    await review.save();
    return review;
  }

  /**
   * Get reviews for seller (all their products)
   */
  async getSellerReviews(
    sellerId: string,
    filters: ReviewFilters = {}
  ): Promise<PaginatedReviews> {
    const sellerProductIds = await this.getSellerProductIds(sellerId);
    if (sellerProductIds.length === 0) {
      return {
        reviews: [],
        total: 0,
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
        totalPages: 0,
      };
    }

    const {
      rating,
      verifiedOnly,
      sortBy = 'recent',
      page = 1,
      limit = 20,
      status,
    } = filters;

    // Build query (simplified - would join with products to find seller's products)
    const query: Record<string, unknown> = {
      productId: { $in: sellerProductIds },
    };

    if (rating) query.rating = rating;
    if (verifiedOnly) query.isVerifiedPurchase = true;
    if (status) query.status = status;

    // Sort options
    let sortOptions: Record<string, 1 | -1> = { createdAt: -1 };
    if (sortBy === 'helpful') {
      sortOptions = { helpful: -1 };
    } else if (sortBy === 'rating') {
      sortOptions = { rating: -1 };
    }

    // Execute query
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      SouqReview.find(query).sort(sortOptions).skip(skip).limit(limit),
      SouqReview.countDocuments(query),
    ]);

    return {
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get product reviews (public)
   */
  async getProductReviews(
    productId: string,
    filters: ReviewFilters = {}
  ): Promise<PaginatedReviews> {
    const {
      rating,
      verifiedOnly,
      sortBy = 'recent',
      page = 1,
      limit = 20,
    } = filters;

    // Build query
    const query: Record<string, unknown> = {
      productId,
      status: 'published', // Only show published reviews
    };

    if (rating) query.rating = rating;
    if (verifiedOnly) query.isVerifiedPurchase = true;

    // Sort options
    let sortOptions: Record<string, 1 | -1> = { createdAt: -1 };
    if (sortBy === 'helpful') {
      sortOptions = { helpful: -1 };
    } else if (sortBy === 'rating') {
      sortOptions = { rating: -1 };
    }

    // Execute query
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      SouqReview.find(query).sort(sortOptions).skip(skip).limit(limit),
      SouqReview.countDocuments(query),
    ]);

    return {
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single review by ID
   */
  async getReviewById(reviewId: string): Promise<IReview | null> {
    return await SouqReview.findOne({ reviewId });
  }

  /**
   * Approve review (moderator)
   */
  async approveReview(reviewId: string, _moderatorId: string): Promise<IReview> {
    const review = await SouqReview.findOne({ reviewId });

    if (!review) {
      throw new Error('Review not found');
    }

    review.status = 'published';
    review.publishedAt = new Date();
    await review.save();
    await this.updateProductAggregates(review.productId);

    return review;
  }

  /**
   * Reject review (moderator)
   */
  async rejectReview(
    reviewId: string,
    _moderatorId: string,
    notes: string
  ): Promise<IReview> {
    const review = await SouqReview.findOne({ reviewId });

    if (!review) {
      throw new Error('Review not found');
    }

    review.status = 'rejected';
    review.moderationNotes = notes;
    await review.save();
    await this.updateProductAggregates(review.productId);

    return review;
  }

  /**
   * Flag review (moderator)
   */
  async flagReview(reviewId: string, reason: string): Promise<IReview> {
    const review = await SouqReview.findOne({ reviewId });

    if (!review) {
      throw new Error('Review not found');
    }

    review.status = 'flagged';
    review.moderationNotes = reason;
    await review.save();
    await this.updateProductAggregates(review.productId);

    return review;
  }

  /**
   * Get review statistics for a product
   */
  async getReviewStats(productId: string): Promise<ReviewStats> {
    const productObjectId = this.ensureObjectId(productId, 'productId');
    const [stats] = await SouqReview.aggregate<{
      totalReviews: number;
      totalRating: number;
      verifiedPurchaseCount: number;
      star1: number;
      star2: number;
      star3: number;
      star4: number;
      star5: number;
    }>([
      { $match: { productId: productObjectId, status: 'published' } },
      {
        $group: {
          _id: '$productId',
          totalReviews: { $sum: 1 },
          totalRating: { $sum: '$rating' },
          verifiedPurchaseCount: {
            $sum: { $cond: [{ $eq: ['$isVerifiedPurchase', true] }, 1, 0] },
          },
          star1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          star2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          star3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          star4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          star5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        },
      },
    ]);

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: stats?.star1 ?? 0,
      2: stats?.star2 ?? 0,
      3: stats?.star3 ?? 0,
      4: stats?.star4 ?? 0,
      5: stats?.star5 ?? 0,
    };

    const totalReviews = stats?.totalReviews ?? 0;
    const averageRating = totalReviews > 0 ? stats!.totalRating / totalReviews : 0;
    const verifiedPurchaseCount = stats?.verifiedPurchaseCount ?? 0;

    const recentReviews = await SouqReview.find({
      productId: productObjectId,
      status: 'published',
    })
      .sort({ createdAt: -1 })
      .limit(5);

    return {
      averageRating,
      totalReviews,
      distribution,
      verifiedPurchaseCount,
      recentReviews,
    };
  }

  /**
   * Get seller review statistics
   */
  async getSellerReviewStats(sellerId: string): Promise<SellerReviewStats> {
    const sellerProductIds = await this.getSellerProductIds(sellerId);
    if (sellerProductIds.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        pendingResponses: 0,
        responseRate: 0,
        recentReviews: [],
      };
    }

    const reviews = await SouqReview.find({
      status: 'published',
      productId: { $in: sellerProductIds },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    const pendingResponses = reviews.filter((r) => !r.sellerResponse).length;
    const responseRate =
      totalReviews > 0 ? ((totalReviews - pendingResponses) / totalReviews) * 100 : 0;

    const recentReviews = reviews
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    return {
      averageRating,
      totalReviews,
      pendingResponses,
      responseRate,
      recentReviews,
    };
  }

  private async getSellerProductIds(
    sellerId: string
  ): Promise<mongoose.Types.ObjectId[]> {
    if (!sellerId || !Types.ObjectId.isValid(sellerId)) {
      return [];
    }

    const products = await SouqProduct.find({ createdBy: sellerId }).select('_id').lean();
    return products.map((product) => product._id);
  }

  private ensureObjectId(id: string, fieldName: string): mongoose.Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ${fieldName}`);
    }
    return new Types.ObjectId(id);
  }

  private assertRatingRange(rating: number): void {
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
  }

  private async updateProductAggregates(productId: mongoose.Types.ObjectId): Promise<void> {
    const [stats] = await SouqReview.aggregate<{
      totalReviews: number;
      totalRating: number;
      star1: number;
      star2: number;
      star3: number;
      star4: number;
      star5: number;
    }>([
      { $match: { productId, status: 'published' } },
      {
        $group: {
          _id: '$productId',
          totalReviews: { $sum: 1 },
          totalRating: { $sum: '$rating' },
          star1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          star2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          star3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          star4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          star5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        },
      },
    ]);

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: stats?.star1 ?? 0,
      2: stats?.star2 ?? 0,
      3: stats?.star3 ?? 0,
      4: stats?.star4 ?? 0,
      5: stats?.star5 ?? 0,
    };

    const totalReviews = stats?.totalReviews ?? 0;
    const averageRating = totalReviews > 0 ? stats!.totalRating / totalReviews : 0;

    await SouqProduct.updateOne(
      { _id: productId },
      {
        $set: {
          averageRating,
          reviewCount: totalReviews,
          ratingDistribution: distribution,
        },
      }
    );
  }
}

export const reviewService = new ReviewService();
