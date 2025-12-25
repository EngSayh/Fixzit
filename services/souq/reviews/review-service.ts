/**
 * Souq Review Service - Handles review operations
 * @module services/souq/reviews/review-service
 */

import { SouqReview, type IReview } from "@/server/models/souq/Review";
import { SouqOrder } from "@/server/models/souq/Order";
import { SouqProduct, type IProduct } from "@/server/models/souq/Product";
import { buildSouqOrgFilter } from "@/services/souq/org-scope";
import { isSouqModeratorRole } from "@/types/user";
import { nanoid } from "nanoid";
import type mongoose from "mongoose";
import { Types, type FilterQuery } from "mongoose";

// 🚀 PERF: Maximum limit for paginated queries to prevent abuse
const MAX_PAGE_LIMIT = 100;
// 🛡️ Moderation: Number of unique reports before auto-flagging a review
const REPORT_FLAG_THRESHOLD = 3;

// 🔐 STRICT v4.1: Helper to validate moderator role (uses centralized types/user.ts)
const assertModeratorRole = (role: string | undefined | null): void => {
  if (!isSouqModeratorRole(role)) {
    throw new Error("Unauthorized: Moderator role required");
  }
};

// Helper to cast org filter to Mongoose FilterQuery type
const getOrgFilter = (orgId: string): FilterQuery<IReview> =>
  buildSouqOrgFilter(orgId) as FilterQuery<IReview>;
const getProductOrgFilter = (orgId: string): FilterQuery<IProduct> =>
  buildSouqOrgFilter(orgId) as FilterQuery<IProduct>;

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
  sortBy?: "recent" | "helpful" | "rating";
  page?: number;
  limit?: number;
  status?: "pending" | "published" | "rejected" | "flagged";
  customerId?: string;
}

export interface PaginatedReviews {
  reviews: IReview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReviewListResult {
  reviews: IReview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// 🚀 PERF: Lean review type for read-only queries (better performance)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeanReview = Record<string, any>;

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  verifiedPurchaseCount: number;
  recentReviews: LeanReview[];
}

export interface SellerReviewStats {
  averageRating: number;
  totalReviews: number;
  pendingResponses: number;
  responseRate: number;
  recentReviews: LeanReview[];
}

class ReviewService {
  /**
   * Submit a new review
   */
  async submitReview(orgId: string, data: CreateReviewDto): Promise<IReview> {
    // 🔐 STRICT v4.1: Validate rating is provided before range check
    if (data.rating == null) {
      throw new Error("Rating is required");
    }
    this.assertRatingRange(data.rating);

    const orgObjectId = this.ensureObjectId(orgId, "orgId");
    const productObjectId = this.ensureObjectId(data.productId, "productId");
    const customerObjectId = this.ensureObjectId(data.customerId, "customerId");
    // 🔐 STRICT v4.1: Use shared org filter for consistency across Souq services
    const orgFilter = getOrgFilter(orgId);

    const product = await SouqProduct.findOne({
      _id: productObjectId,
      ...orgFilter,
    }).select("fsin isActive");
    if (!product) {
      throw new Error("Product not found");
    }
    if (product.isActive === false) {
      throw new Error("Cannot review inactive product");
    }

    // Check for duplicate review
    const existingReview = await SouqReview.findOne({
      customerId: customerObjectId,
      productId: productObjectId,
      ...orgFilter,
    });

    if (existingReview) {
      throw new Error("You have already reviewed this product");
    }

    // Verify purchase if orderId provided
    let isVerifiedPurchase = false;
    let orderIdObj: mongoose.Types.ObjectId | undefined;

    if (data.orderId) {
      const order = await SouqOrder.findOne({
        orderId: data.orderId,
        customerId: customerObjectId,
        ...orgFilter,
        "items.productId": productObjectId,
        status: "delivered",
      });

      if (order) {
        isVerifiedPurchase = true;
        orderIdObj = order._id;
      }
    }

    // Create review
    const review = await SouqReview.create({
      reviewId: `REV-${nanoid(10)}`,
      orgId: orgObjectId,
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
      status: "pending", // Requires moderation
    });

    return review;
  }

  /**
   * Update existing review (customer only)
   */
  async updateReview(
    reviewId: string,
    orgId: string,
    customerId: string,
    data: UpdateReviewDto,
  ): Promise<IReview> {
    const customerObjectId = this.ensureObjectId(customerId, "customerId");
    // 🔐 STRICT v4.1: Use shared org filter for consistency
    const orgFilter = getOrgFilter(orgId);
    const review = await SouqReview.findOne({
      reviewId,
      customerId: customerObjectId,
      ...orgFilter,
    });

    if (!review) {
      throw new Error("Review not found or unauthorized");
    }

    if (review.status === "published") {
      throw new Error("Cannot edit published reviews");
    }

    // Update fields
    if (data.title) review.title = data.title;
    if (data.content) review.content = data.content;
    if (data.pros) review.pros = data.pros;
    if (data.cons) review.cons = data.cons;
    if (data.images) {
      review.images = data.images.map((img) => ({
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
  async deleteReview(reviewId: string, orgId: string, customerId: string): Promise<void> {
    const customerObjectId = this.ensureObjectId(customerId, "customerId");
    // 🔐 STRICT v4.1: Use shared org filter for consistency
    const orgFilter = getOrgFilter(orgId);
    const review = await SouqReview.findOne({
      reviewId,
      customerId: customerObjectId,
      ...orgFilter,
    });

    if (!review) {
      throw new Error("Review not found or unauthorized");
    }

    if (review.status === "published") {
      throw new Error("Cannot delete published reviews");
    }

    await review.deleteOne();
  }

  /**
   * Mark review as helpful
   */
  async markHelpful(reviewId: string, orgId: string, customerId: string): Promise<IReview> {
    // 🔐 STRICT v4.1: Use shared org filter for consistency
    const orgFilter = getOrgFilter(orgId);
    const voterObjectId = this.ensureObjectId(customerId, "customerId");
    const review = await SouqReview.findOne({
      reviewId,
      ...orgFilter,
    }).select("+helpfulVoters +notHelpfulVoters");

    if (!review) {
      throw new Error("Review not found");
    }
    if (review.status !== "published") {
      throw new Error("Cannot vote on unpublished reviews");
    }

    const voterIdStr = voterObjectId.toString();
    const helpfulSet = new Set(
      (review.helpfulVoters ?? []).map((id) => id.toString()),
    );
    const notHelpfulSet = new Set(
      (review.notHelpfulVoters ?? []).map((id) => id.toString()),
    );
    const alreadyHelpful = helpfulSet.has(voterIdStr);
    const wasNotHelpful = notHelpfulSet.has(voterIdStr);

    if (!alreadyHelpful) {
      helpfulSet.add(voterIdStr);
      review.helpful = Math.max(0, (review.helpful ?? 0) + 1);
    }
    if (wasNotHelpful) {
      notHelpfulSet.delete(voterIdStr);
      review.notHelpful = Math.max(0, (review.notHelpful ?? 0) - 1);
    }

    review.helpfulVoters = Array.from(helpfulSet).map(
      (id) => new Types.ObjectId(id),
    );
    review.notHelpfulVoters = Array.from(notHelpfulSet).map(
      (id) => new Types.ObjectId(id),
    );
    await review.save();

    return review;
  }

  /**
   * Mark review as not helpful
   */
  async markNotHelpful(
    reviewId: string,
    orgId: string,
    customerId: string,
  ): Promise<IReview> {
    const orgFilter = getOrgFilter(orgId);
    const voterObjectId = this.ensureObjectId(customerId, "customerId");
    const review = await SouqReview.findOne({
      reviewId,
      ...orgFilter,
    }).select("+helpfulVoters +notHelpfulVoters");

    if (!review) {
      throw new Error("Review not found");
    }
    if (review.status !== "published") {
      throw new Error("Cannot vote on unpublished reviews");
    }

    const voterIdStr = voterObjectId.toString();
    const helpfulSet = new Set(
      (review.helpfulVoters ?? []).map((id) => id.toString()),
    );
    const notHelpfulSet = new Set(
      (review.notHelpfulVoters ?? []).map((id) => id.toString()),
    );
    const wasHelpful = helpfulSet.has(voterIdStr);
    const alreadyNotHelpful = notHelpfulSet.has(voterIdStr);

    if (!alreadyNotHelpful) {
      notHelpfulSet.add(voterIdStr);
      review.notHelpful = Math.max(0, (review.notHelpful ?? 0) + 1);
    }
    if (wasHelpful) {
      helpfulSet.delete(voterIdStr);
      review.helpful = Math.max(0, (review.helpful ?? 0) - 1);
    }

    review.helpfulVoters = Array.from(helpfulSet).map(
      (id) => new Types.ObjectId(id),
    );
    review.notHelpfulVoters = Array.from(notHelpfulSet).map(
      (id) => new Types.ObjectId(id),
    );
    await review.save();

    return review;
  }

  /**
   * Report inappropriate review
   * @param reviewId - The review to report
   * @param orgId - Organization ID for tenant isolation
   * @param reporterId - ID of the user making the report (for dedup/rate-limit)
   * @param reason - Reason for reporting
   */
  async reportReview(
    reviewId: string,
    orgId: string,
    reporterId: string,
    reason: string,
  ): Promise<IReview> {
    const orgFilter = getOrgFilter(orgId);
    const reporterObjectId = this.ensureObjectId(reporterId, "reporterId");

    // Deduplicate by reporter to prevent spam; only increment count when reporter is new
    const updated = await SouqReview.findOneAndUpdate(
      {
        reviewId,
        ...orgFilter,
        reporters: { $ne: reporterObjectId },
      },
      {
        $addToSet: { reporters: reporterObjectId },
        $push: { reportReasons: { $each: [reason], $slice: -20 } },
        $inc: { reportedCount: 1 },
      },
      { new: true, select: "+reporters" },
    );

    // If the reporter already exists, fetch current state without mutating counts
    const review =
      updated ??
      (await SouqReview.findOne({
        reviewId,
        ...orgFilter,
      }).select("+reporters"));

    if (!review) {
      throw new Error("Review not found");
    }

    // Auto-flag if threshold reached
    if (review.reportedCount >= REPORT_FLAG_THRESHOLD && review.status === "published") {
      review.status = "flagged";
      await review.save();
      const productObjectId = this.ensureObjectId(
        String(review.productId),
        "productId",
      );
      await this.updateProductAggregates(productObjectId, orgId);
    } else if (updated) {
      // Persist the new reason even when not flagging
      await review.save();
    }

    // 🚫 Privacy: do not return reporter identities or report details to callers
    delete (review as { reporters?: unknown }).reporters;
    delete (review as { reportReasons?: unknown }).reportReasons;

    return review;
  }

  /**
   * Seller responds to review
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  async respondToReview(
    orgId: string,
    reviewId: string,
    sellerId: string,
    content: string,
  ): Promise<IReview> {
    // 🔐 STRICT v4.1: orgId is ALWAYS required for tenant isolation
    if (!orgId) {
      throw new Error('orgId is required for respondToReview (STRICT v4.1 tenant isolation)');
    }
    const orgFilter = getOrgFilter(orgId);
    const review = await SouqReview.findOne({
      reviewId,
      ...orgFilter,
    });

    if (!review) {
      throw new Error("Review not found");
    }

    if (review.status !== "published") {
      throw new Error("Can only respond to published reviews");
    }

    const reviewOrgId =
      (review as { orgId?: mongoose.Types.ObjectId | string })?.orgId ||
      (review as { org_id?: mongoose.Types.ObjectId | string })?.org_id;
    if (!reviewOrgId) {
      throw new Error("Review missing orgId");
    }
    const productObjectId = this.ensureObjectId(
      String(review.productId),
      "productId",
    );
    const reviewOrgFilter = getProductOrgFilter(String(reviewOrgId));

    const product = await SouqProduct.findOne({
      _id: productObjectId,
      ...reviewOrgFilter,
    }).select("createdBy");
    if (!Types.ObjectId.isValid(sellerId)) {
      throw new Error("Invalid seller id");
    }
    const ownerId =
      typeof product?.createdBy === "string"
        ? product.createdBy
        : product?.createdBy?.toString?.();

    if (!product || ownerId !== sellerId) {
      throw new Error("Unauthorized to respond to this review");
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
   * List reviews for a customer (their own reviews)
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  async listReviews(
    orgId: string,
    filters: ReviewFilters = {},
  ): Promise<ReviewListResult> {
    // 🔐 STRICT v4.1: orgId is ALWAYS required for tenant isolation
    if (!orgId) {
      throw new Error("orgId is required for listReviews (STRICT v4.1 tenant isolation)");
    }
    const orgFilter = getOrgFilter(orgId);

    const {
      customerId,
      rating,
      verifiedOnly,
      status,
      page = 1,
      limit = 20,
    } = filters;

    // Build query - 🔐 STRICT v4.1: Include org filter for tenant isolation
    const query: FilterQuery<IReview> = {
      ...orgFilter,
    };

    if (customerId) query.customerId = this.ensureObjectId(customerId, "customerId");
    if (rating) query.rating = rating;
    if (verifiedOnly) query.isVerifiedPurchase = true;
    if (status) query.status = status;

    // Execute query with pagination
    const safeLimit = Math.min(limit ?? 20, MAX_PAGE_LIMIT);
    const currentPage = Math.max(page ?? 1, 1);
    const skip = (currentPage - 1) * safeLimit;
    const [reviews, total] = await Promise.all([
      SouqReview.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
      SouqReview.countDocuments(query),
    ]);

    return {
      reviews: reviews as unknown as IReview[],
      pagination: {
        total,
        page: currentPage,
        limit: safeLimit,
        pages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Get reviews for seller (all their products)
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  async getSellerReviews(
    orgId: string,
    sellerId: string,
    filters: ReviewFilters = {},
  ): Promise<PaginatedReviews> {
    // 🔐 STRICT v4.1: orgId is ALWAYS required for tenant isolation
    if (!orgId) {
      throw new Error('orgId is required for getSellerReviews (STRICT v4.1 tenant isolation)');
    }
    const orgFilter = getOrgFilter(orgId);
    const sellerProductIds = await this.getSellerProductIds(orgId, sellerId);
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
      sortBy = "recent",
      page = 1,
      limit = 20,
      status,
    } = filters;

    // Build query - 🔐 STRICT v4.1: Include org filter for tenant isolation
    const query: Record<string, unknown> = {
      productId: { $in: sellerProductIds },
      ...orgFilter,
    };

    if (rating) query.rating = rating;
    if (verifiedOnly) query.isVerifiedPurchase = true;
    if (status) query.status = status;

    // Sort options
    let sortOptions: Record<string, 1 | -1> = { createdAt: -1 };
    if (sortBy === "helpful") {
      sortOptions = { helpful: -1 };
    } else if (sortBy === "rating") {
      sortOptions = { rating: -1 };
    }

    // Execute query
    const safeLimit = Math.min(limit ?? 20, MAX_PAGE_LIMIT);
    const currentPage = Math.max(page ?? 1, 1);
    const skip = (currentPage - 1) * safeLimit;
    const [reviews, total] = await Promise.all([
      SouqReview.find(query).sort(sortOptions).skip(skip).limit(safeLimit).lean(),
      SouqReview.countDocuments(query),
    ]);

    return {
      reviews: reviews as unknown as IReview[],
      total,
      page: currentPage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * Get product reviews (public)
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  async getProductReviews(
    productId: string,
    orgId: string,
    filters: ReviewFilters = {},
  ): Promise<PaginatedReviews> {
    // 🔐 STRICT v4.1: orgId is ALWAYS required for tenant isolation
    if (!orgId) {
      throw new Error('orgId is required for getProductReviews (STRICT v4.1 tenant isolation)');
    }
    const orgFilter = getOrgFilter(orgId);
    const productObjectId = this.ensureObjectId(productId, "productId");

    const {
      rating,
      verifiedOnly,
      sortBy = "recent",
      page = 1,
      limit = 20,
    } = filters;

    // Build query
    const query: Record<string, unknown> = {
      productId: { $in: [productId, productObjectId] },
      status: "published", // Only show published reviews
      ...orgFilter,
    };

    if (rating) query.rating = rating;
    if (verifiedOnly) query.isVerifiedPurchase = true;

    // Sort options
    let sortOptions: Record<string, 1 | -1> = { createdAt: -1 };
    if (sortBy === "helpful") {
      sortOptions = { helpful: -1 };
    } else if (sortBy === "rating") {
      sortOptions = { rating: -1 };
    }

    // Execute query
    const safeLimit = Math.min(limit ?? 20, MAX_PAGE_LIMIT);
    const currentPage = Math.max(page ?? 1, 1);
    const skip = (currentPage - 1) * safeLimit;
    const [reviews, total] = await Promise.all([
      SouqReview.find(query).sort(sortOptions).skip(skip).limit(safeLimit).lean(),
      SouqReview.countDocuments(query),
    ]);

    return {
      reviews: reviews as unknown as IReview[],
      total,
      page: currentPage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * Get single review by ID
   */
  async getReviewById(reviewId: string, orgId: string): Promise<IReview | null> {
    const orgFilter = getOrgFilter(orgId);
    return await SouqReview.findOne({
      reviewId,
      ...orgFilter,
    });
  }

  /**
   * Check if review exists and get basic info for authorization
   * @returns Basic review info or null if not found
   */
  async getReviewBasicInfo(
    reviewId: string,
    orgId: string
  ): Promise<{ orgId: string; customerId: string; status: string } | null> {
    const orgFilter = getOrgFilter(orgId);
    const review = await SouqReview.findOne(
      { reviewId, ...orgFilter },
      { orgId: 1, customerId: 1, status: 1 }
    ).lean();
    
    if (!review) return null;
    
    return {
      orgId: review.orgId?.toString() ?? "",
      customerId: review.customerId?.toString() ?? "",
      status: review.status ?? "pending",
    };
  }

  /**
   * TD-001: Get product's orgId for tenant-scoped review queries
   * Replaces db.collection().findOne() calls in routes
   * @param productId - The product ID (fsin)
   * @returns orgId or null if product not found
   */
  async getProductOrgId(productId: string): Promise<string | null> {
    // orgId-lint-ignore -- PLATFORM_WIDE: Looking up product to GET its orgId for tenant scoping
    const product = await SouqProduct.findOne(
      { $or: [{ productId }, { fsin: productId }] },
      { orgId: 1 }
    ).lean();
    
    return product?.orgId?.toString() ?? null;
  }

  /**
   * Approve review (moderator)
   * 🔐 STRICT v4.1: Requires moderator role validation
   */
  async approveReview(
    reviewId: string,
    orgId: string,
    moderatorId: string,
    moderatorRole: string,
  ): Promise<IReview> {
    // 🔐 STRICT v4.1: Validate moderator has appropriate role
    assertModeratorRole(moderatorRole);
    
    const orgFilter = getOrgFilter(orgId);
    const review = await SouqReview.findOne({
      reviewId,
      ...orgFilter,
    });

    if (!review) {
      throw new Error("Review not found");
    }

    review.status = "published";
    review.publishedAt = new Date();
    // 🔐 AUDIT: Record who approved the review
    review.moderatedBy = new Types.ObjectId(moderatorId);
    review.moderatedAt = new Date();
    await review.save();
    await this.updateProductAggregates(review.productId, orgId);

    return review;
  }

  /**
   * Reject review (moderator)
   * 🔐 STRICT v4.1: Requires moderator role validation
   */
  async rejectReview(
    reviewId: string,
    orgId: string,
    moderatorId: string,
    moderatorRole: string,
    notes: string,
  ): Promise<IReview> {
    // 🔐 STRICT v4.1: Validate moderator has appropriate role
    assertModeratorRole(moderatorRole);
    
    const orgFilter = getOrgFilter(orgId);
    const review = await SouqReview.findOne({
      reviewId,
      ...orgFilter,
    });

    if (!review) {
      throw new Error("Review not found");
    }

    review.status = "rejected";
    review.moderationNotes = notes;
    // 🔐 AUDIT: Record who rejected the review
    review.moderatedBy = new Types.ObjectId(moderatorId);
    review.moderatedAt = new Date();
    await review.save();
    await this.updateProductAggregates(review.productId, orgId);

    return review;
  }

  /**
   * Flag a review for additional moderation review (moderator only)
   * @param reviewId - Unique review identifier
   * @param orgId - Organization ID for multi-tenant isolation
   * @param moderatorId - ID of the moderator flagging the review
   * @param moderatorRole - Role of the moderator (must be in MODERATOR_ROLES)
   * @param reason - Detailed reason for flagging
   * @returns The flagged review document with status 'flagged'
   * @throws Error if unauthorized role, review not found, or reason is empty
   * 🔐 STRICT v4.1: Requires moderator role validation
   */
  async flagReview(
    reviewId: string,
    orgId: string,
    moderatorId: string,
    moderatorRole: string,
    reason: string,
  ): Promise<IReview> {
    // 🔐 STRICT v4.1: Validate moderator has appropriate role
    assertModeratorRole(moderatorRole);
    
    if (!reason) {
      throw new Error("Flag reason is required");
    }
    const orgFilter = getOrgFilter(orgId);
    const review = await SouqReview.findOne({
      reviewId,
      ...orgFilter,
    });

    if (!review) {
      throw new Error("Review not found");
    }

    review.status = "flagged";
    review.moderationNotes = reason;
    // 🔐 AUDIT: Record who flagged the review
    review.moderatedBy = new Types.ObjectId(moderatorId);
    review.moderatedAt = new Date();
    await review.save();
    await this.updateProductAggregates(review.productId, orgId);

    return review;
  }

  /**
   * Get review statistics for a product including rating distribution and recent reviews
   * @param productId - Product identifier (string or ObjectId format)
   * @param orgId - Organization ID for multi-tenant isolation
   * @returns Aggregated stats: averageRating, totalReviews, ratingBreakdown, verifiedPurchaseCount, recentReviews
   */
  async getReviewStats(productId: string, orgId: string): Promise<ReviewStats> {
    const productObjectId = this.ensureObjectId(productId, "productId");
    const orgFilter = getOrgFilter(orgId);
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
      {
        $match: {
          productId: { $in: [productObjectId, productId] },
          status: "published",
          ...orgFilter,
        },
      },
      {
        $group: {
          _id: "$productId",
          totalReviews: { $sum: 1 },
          totalRating: { $sum: "$rating" },
          verifiedPurchaseCount: {
            $sum: { $cond: [{ $eq: ["$isVerifiedPurchase", true] }, 1, 0] },
          },
          star1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
          star2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          star3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          star4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          star5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
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
    const averageRating =
      totalReviews > 0 ? stats!.totalRating / totalReviews : 0;
    const verifiedPurchaseCount = stats?.verifiedPurchaseCount ?? 0;

    // 🔐 STRICT v4.1: Include org filter for tenant isolation
    // 🚀 PERF: Use .lean() for read-only data
    const recentReviews = await SouqReview.find({
      productId: { $in: [productObjectId, productId] },
      status: "published",
      ...orgFilter,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

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
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  async getSellerReviewStats(orgId: string, sellerId: string): Promise<SellerReviewStats> {
    // 🔐 STRICT v4.1: orgId is ALWAYS required for tenant isolation
    if (!orgId) {
      throw new Error('orgId is required for getSellerReviewStats (STRICT v4.1 tenant isolation)');
    }
    const orgFilter = getOrgFilter(orgId);
    const sellerProductIds = await this.getSellerProductIds(orgId, sellerId);
    if (sellerProductIds.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        pendingResponses: 0,
        responseRate: 0,
        recentReviews: [],
      };
    }

    // 🔐 STRICT v4.1: Include org filter for tenant isolation
    // 🚀 PERF: Use aggregation instead of loading all reviews into memory
    const matchStage = {
      status: "published",
      productId: { $in: sellerProductIds },
      ...orgFilter,
    };

    const [stats] = await SouqReview.aggregate<{
      totalReviews: number;
      avgRating: number;
      pendingResponses: number;
    }>([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          avgRating: { $avg: "$rating" },
          pendingResponses: {
            $sum: { $cond: [{ $not: ["$sellerResponse"] }, 1, 0] },
          },
        },
      },
    ]);

    const totalReviews = stats?.totalReviews ?? 0;
    const averageRating = stats?.avgRating ?? 0;
    const pendingResponses = stats?.pendingResponses ?? 0;
    const responseRate =
      totalReviews > 0
        ? ((totalReviews - pendingResponses) / totalReviews) * 100
        : 0;

    // Fetch only recent 5 reviews using DB sort/limit instead of loading all
    const recentReviews = await SouqReview.find(matchStage)
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return {
      averageRating,
      totalReviews,
      pendingResponses,
      responseRate,
      recentReviews,
    };
  }

  /**
   * Get product IDs for a seller within an org
   * @param orgId - Required for STRICT v4.1 tenant isolation
   */
  private async getSellerProductIds(
    orgId: string,
    sellerId: string,
  ): Promise<mongoose.Types.ObjectId[]> {
    // 🔐 STRICT v4.1: orgId is ALWAYS required for tenant isolation
    if (!orgId) {
      throw new Error('orgId is required for getSellerProductIds (STRICT v4.1 tenant isolation)');
    }
    if (!sellerId || !Types.ObjectId.isValid(sellerId)) {
      return [];
    }

    const orgFilter = getOrgFilter(orgId);
    // 🔧 FIX: Convert sellerId to ObjectId to match schema type
    const sellerObjectId = new Types.ObjectId(sellerId);
    // 🔐 STRICT v4.1: Include org filter for tenant isolation
    const products = await SouqProduct.find({
      createdBy: sellerObjectId,
      ...orgFilter,
    })
      .select("_id")
      .lean();
    return products.map((product) => product._id);
  }

  /**
   * Validates and converts a string ID to a Mongoose ObjectId
   * @param id - The string ID to convert
   * @param fieldName - The field name for error messages
   * @throws Error if the ID is not a valid ObjectId format
   */
  private ensureObjectId(
    id: string,
    fieldName: string,
  ): mongoose.Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ${fieldName}`);
    }
    return new Types.ObjectId(id);
  }

  /**
   * Validates that rating is an integer between 1 and 5
   * @param rating - The rating value to validate
   * @throws Error if rating is not an integer or out of range
   */
  private assertRatingRange(rating: number): void {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error("Rating must be an integer between 1 and 5");
    }
  }

  /**
   * Updates product aggregate statistics after review changes
   * Recalculates average rating, total reviews, and rating distribution
   * @param productId - The product ObjectId to update
   * @param orgId - Organization ID for tenant isolation
   */
  private async updateProductAggregates(
    productId: mongoose.Types.ObjectId,
    orgId: string,
  ): Promise<void> {
    const orgFilter = getOrgFilter(orgId);
    const [stats] = await SouqReview.aggregate<{
      totalReviews: number;
      totalRating: number;
      star1: number;
      star2: number;
      star3: number;
      star4: number;
      star5: number;
    }>([
      { $match: { productId, status: "published", ...orgFilter } },
      {
        $group: {
          _id: "$productId",
          totalReviews: { $sum: 1 },
          totalRating: { $sum: "$rating" },
          star1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
          star2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          star3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          star4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          star5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
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
    const averageRating =
      totalReviews > 0 ? stats!.totalRating / totalReviews : 0;

    await SouqProduct.updateOne(
      { _id: productId, ...orgFilter },
      {
        $set: {
          averageRating,
          reviewCount: totalReviews,
          ratingDistribution: distribution,
        },
      },
    );
  }
}

export const reviewService = new ReviewService();
