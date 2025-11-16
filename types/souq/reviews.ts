/**
 * Souq Reviews Types
 * @module types/souq/reviews
 */

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
  images?: ReviewImage[];
}

export interface UpdateReviewDto {
  title?: string;
  content?: string;
  pros?: string[];
  cons?: string[];
  images?: ReviewImage[];
}

export interface ReviewImage {
  url: string;
  caption?: string;
}

export interface ReviewFilters {
  rating?: number;
  verifiedOnly?: boolean;
  sortBy?: 'recent' | 'helpful' | 'rating';
  page?: number;
  limit?: number;
  status?: ReviewStatus;
}

export type ReviewStatus = 'pending' | 'published' | 'rejected' | 'flagged';

export interface PaginatedReviews<T = Review> {
  reviews: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Review {
  reviewId: string;
  productId: string;
  fsin: string;
  customerId: string;
  customerName: string;
  isVerifiedPurchase: boolean;
  orderId?: string;
  rating: number;
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  images: ReviewImage[];
  helpful: number;
  notHelpful: number;
  reportedCount: number;
  reportReasons?: string[];
  status: ReviewStatus;
  sellerResponse?: SellerResponse;
  moderationNotes?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerResponse {
  content: string;
  respondedAt: Date;
  respondedBy: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: RatingDistribution;
  verifiedPurchaseCount: number;
  recentReviews: Review[];
}

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface RatingDistributionWithPercentage {
  5: { count: number; percentage: number };
  4: { count: number; percentage: number };
  3: { count: number; percentage: number };
  2: { count: number; percentage: number };
  1: { count: number; percentage: number };
}

export interface SellerReviewStats {
  averageRating: number;
  totalReviews: number;
  pendingResponses: number;
  responseRate: number;
  recentReviews: Review[];
}

export interface RatingAggregate {
  averageRating: number;
  totalReviews: number;
  distribution: RatingDistribution;
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
