/**
 * Seller Reviews Dashboard - Manage and respond to product reviews
 * @route /marketplace/seller-central/reviews
 */

import React from 'react';
import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { reviewService } from '@/services/souq/reviews/review-service';
import { SellerReviewsDashboard } from '@/components/marketplace/seller-central/SellerReviewsDashboard';

export const metadata: Metadata = {
  title: 'Product Reviews | Seller Central',
  description: 'Manage and respond to product reviews',
};

export default async function SellerReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login?callbackUrl=/marketplace/seller-central/reviews');
  }

  const params = await searchParams;
  const page = parseInt((params.page as string) || '1');
  const status = (params.status as string) || 'published';

  // Fetch seller reviews
  const reviewsData = await reviewService.getSellerReviews(session.user.id, {
    page,
    limit: 20,
    status: status as 'pending' | 'published' | 'rejected' | 'flagged',
  });

  // Get seller stats
  const stats = await reviewService.getSellerReviewStats(session.user.id);

  return (
    <SellerReviewsDashboard
      stats={{
        averageRating: stats.averageRating,
        totalReviews: stats.totalReviews,
        responseRate: stats.responseRate,
        pendingResponses: stats.pendingResponses,
      }}
      reviews={reviewsData.reviews}
      totalPages={reviewsData.totalPages}
      page={page}
      status={status as 'published' | 'pending' | 'flagged'}
    />
  );
}
