/**
 * Product Reviews Page - Public reviews for a product
 * @route /marketplace/products/[id]/reviews
 */

import React from 'react';
import { Metadata } from 'next';
import { reviewService } from '@/services/souq/reviews/review-service';
import { ProductReviewsClient } from '@/components/marketplace/ProductReviewsClient';

export const metadata: Metadata = {
  title: 'Product Reviews',
  description: 'Customer reviews and ratings',
};

export default async function ProductReviewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: productId } = await params;

  // Fetch reviews and stats
  const [reviewsData, stats] = await Promise.all([
    reviewService.getProductReviews(productId, {
      page: 1,
      limit: 20,
    }),
    reviewService.getReviewStats(productId),
  ]);

  // Calculate distribution from stats
  const distribution = {
    5: {
      count: stats.distribution[5],
      percentage: stats.totalReviews > 0 ? Math.round((stats.distribution[5] / stats.totalReviews) * 100) : 0,
    },
    4: {
      count: stats.distribution[4],
      percentage: stats.totalReviews > 0 ? Math.round((stats.distribution[4] / stats.totalReviews) * 100) : 0,
    },
    3: {
      count: stats.distribution[3],
      percentage: stats.totalReviews > 0 ? Math.round((stats.distribution[3] / stats.totalReviews) * 100) : 0,
    },
    2: {
      count: stats.distribution[2],
      percentage: stats.totalReviews > 0 ? Math.round((stats.distribution[2] / stats.totalReviews) * 100) : 0,
    },
    1: {
      count: stats.distribution[1],
      percentage: stats.totalReviews > 0 ? Math.round((stats.distribution[1] / stats.totalReviews) * 100) : 0,
    },
  };

  const normalizedReviews = reviewsData.reviews.map((review) => {
    const rawId =
      review.reviewId ||
      (typeof review._id === 'string'
        ? review._id
        : (review._id as { toString?: () => string } | undefined)?.toString?.()) ||
      `review-${Math.random().toString(36).slice(2)}`;

    return {
      _id: rawId,
      rating: review.rating,
      title: review.title,
      comment: review.content,
      createdAt: review.createdAt ? new Date(review.createdAt).toISOString() : undefined,
      author: {
        name: review.customerName,
        verifiedPurchase: review.isVerifiedPurchase,
      },
    };
  });

  return (
    <ProductReviewsClient
      productId={productId}
      stats={{
        averageRating: stats.averageRating,
        totalReviews: stats.totalReviews,
        distribution,
        verifiedPurchasePercentage: Math.round(
          stats.totalReviews > 0 ? (stats.verifiedPurchaseCount / stats.totalReviews) * 100 : 0
        ),
      }}
      initialReviews={normalizedReviews}
    />
  );
}
