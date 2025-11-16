/**
 * Souq Review Service - Handles review operations
 * @module services/souq/reviews/review-service
 */

import { SouqReview, type IReview } from '@/server/models/souq/Review';
import { SouqOrder } from '@/server/models/souq/Order';
import { SouqProduct } from '@/server/models/souq/Product';
import { nanoid } from 'nanoid';
import type mongoose from 'mongoose';

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
    // Check for duplicate review
    const existingReview = await SouqReview.findOne({
      customerId: data.customerId,
      productId: data.productId,
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
        customerId: data.customerId,
        'items.productId': data.productId,
        status: 'delivered',
      });

      if (order) {
        isVerifiedPurchase = true;
        orderIdObj = order._id;
      }
    }

    // Get FSIN from product (simplified - would query Product model)
    const fsin = `FSIN-${nanoid(10)}`;

    // Create review
    const review = await SouqReview.create({
      reviewId: `REV-${nanoid(10)}`,
      org_id: orgId,
      productId: data.productId,
      fsin,
      customerId: data.customerId,
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
  async markHelpful(reviewId: string, customerId: string): Promise<IReview> {
    const review = await SouqReview.findOne({ reviewId });

    if (!review) {
      throw new Error('Review not found');
    }

    // Increment helpful count (in production, track who voted to prevent duplicates)
    review.helpful += 1;
    await review.save();

    return review;
  }

  /**
   * Mark review as not helpful
   */
  async markNotHelpful(reviewId: string, customerId: string): Promise<IReview> {
    const review = await SouqReview.findOne({ reviewId });

    if (!review) {
      throw new Error('Review not found');
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
      respondedBy: sellerId as unknown as mongoose.Types.ObjectId,
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
  async approveReview(reviewId: string, moderatorId: string): Promise<IReview> {
    const review = await SouqReview.findOne({ reviewId });

    if (!review) {
      throw new Error('Review not found');
    }

    review.status = 'published';
    review.publishedAt = new Date();
    await review.save();

    return review;
  }

  /**
   * Reject review (moderator)
   */
  async rejectReview(
    reviewId: string,
    moderatorId: string,
    notes: string
  ): Promise<IReview> {
    const review = await SouqReview.findOne({ reviewId });

    if (!review) {
      throw new Error('Review not found');
    }

    review.status = 'rejected';
    review.moderationNotes = notes;
    await review.save();

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

    return review;
  }

  /**
   * Get review statistics for a product
   */
  async getReviewStats(productId: string): Promise<ReviewStats> {
    const reviews = await SouqReview.find({
      productId,
      status: 'published',
    });

    const totalReviews = reviews.length;
    const verifiedPurchaseCount = reviews.filter((r) => r.isVerifiedPurchase).length;

    // Calculate average rating
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

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

    // Get recent reviews
    const recentReviews = reviews
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

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
    if (!sellerId) {
      return [];
    }

    const products = await SouqProduct.find({ createdBy: sellerId }).select('_id');
    return products.map((product) => product._id);
  }
}

export const reviewService = new ReviewService();
