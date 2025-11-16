/**
 * Seller Reviews Dashboard - Manage and respond to product reviews
 * @route /marketplace/seller-central/reviews
 */

import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ReviewCard } from '@/components/seller/reviews/ReviewCard';
import { SellerResponseForm } from '@/components/seller/reviews/SellerResponseForm';
import { reviewService } from '@/services/souq/reviews/review-service';
import { MessageSquare, Star, TrendingUp } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Product Reviews</h1>
              <p className="text-muted-foreground mt-1">
                Manage customer feedback and respond to reviews
              </p>
            </div>
            <Link
              href="/marketplace/seller-central"
              className="px-4 py-2 border rounded-lg hover:bg-white"
            >
              Back to Dashboard
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-warning/10 rounded-lg">
                  <Star className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                  <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Reviews</p>
                  <p className="text-2xl font-bold">{stats.totalReviews}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-success/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Response Rate</p>
                  <p className="text-2xl font-bold">{stats.responseRate}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Responses</p>
                  <p className="text-2xl font-bold">{stats.pendingResponses}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="bg-white border rounded-lg p-1 mb-6 flex gap-1">
          {['published', 'pending', 'flagged'].map((tab) => (
            <Link
              key={tab}
              href={`?status=${tab}`}
              className={`flex-1 px-4 py-2 text-center rounded-lg transition-colors ${
                status === tab
                  ? 'bg-primary text-white'
                  : 'hover:bg-gray-50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Link>
          ))}
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {reviewsData.reviews.length > 0 ? (
            reviewsData.reviews.map((review) => (
              <div key={review.reviewId}>
                <ReviewCard review={review} showSellerResponse={true} />
                
                {/* Response Form (if no response yet) */}
                {!review.sellerResponse && review.status === 'published' && (
                  <div className="mt-4">
                    <SellerResponseForm
                      reviewId={review.reviewId}
                      reviewTitle={review.title}
                    />
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white border rounded-lg p-12 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No reviews found</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {reviewsData.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {page > 1 && (
              <Link
                href={`?status=${status}&page=${page - 1}`}
                className="px-4 py-2 border rounded-lg hover:bg-white"
              >
                Previous
              </Link>
            )}
            <span className="text-sm text-muted-foreground">
              Page {page} of {reviewsData.totalPages}
            </span>
            {page < reviewsData.totalPages && (
              <Link
                href={`?status=${status}&page=${page + 1}`}
                className="px-4 py-2 border rounded-lg hover:bg-white"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
