/**
 * Product Reviews Page - Public reviews for a product
 * @route /marketplace/products/[id]/reviews
 */

import React from 'react';
import { Metadata } from 'next';
import { ReviewList } from '@/components/seller/reviews/ReviewList';
import { RatingSummary } from '@/components/seller/reviews/RatingSummary';
import { reviewService } from '@/services/souq/reviews/review-service';
import Link from 'next/link';

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Customer Reviews</h1>
            <p className="text-muted-foreground mt-1">
              Real feedback from verified buyers
            </p>
          </div>
          <Link
            href={`/marketplace/products/${productId}`}
            className="px-4 py-2 border rounded-lg hover:bg-white"
          >
            Back to Product
          </Link>
        </div>

        {/* Rating Summary */}
        <div className="mb-8">
          <RatingSummary
            stats={{
              averageRating: stats.averageRating,
              totalReviews: stats.totalReviews,
              distribution,
              verifiedPurchasePercentage: Math.round(
                (stats.verifiedPurchaseCount / stats.totalReviews) * 100
              ),
            }}
            showVerified={true}
          />
        </div>

        {/* Reviews List */}
        <ReviewList
          productId={productId}
          initialReviews={reviewsData.reviews}
        />
      </div>
    </div>
  );
}
