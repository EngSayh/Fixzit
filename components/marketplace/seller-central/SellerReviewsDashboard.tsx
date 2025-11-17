'use client';

import Link from 'next/link';
import { MessageSquare, Star, TrendingUp } from 'lucide-react';
import type { IReview } from '@/server/models/souq/Review';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import { ReviewCard } from '@/components/seller/reviews/ReviewCard';
import { SellerResponseForm } from '@/components/seller/reviews/SellerResponseForm';

type ReviewStatus = 'published' | 'pending' | 'flagged';

interface SellerReviewStats {
  averageRating: number;
  totalReviews: number;
  responseRate: number;
  pendingResponses: number;
}

interface SellerReviewsDashboardProps {
  stats: SellerReviewStats;
  reviews: IReview[];
  totalPages: number;
  page: number;
  status: ReviewStatus;
}

export function SellerReviewsDashboard({
  stats,
  reviews,
  totalPages,
  page,
  status,
}: SellerReviewsDashboardProps) {
  const auto = useAutoTranslator('marketplace.sellerCentral.reviews');
  const statusTabs: ReviewStatus[] = ['published', 'pending', 'flagged'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">
                {auto('Product Reviews', 'header.title')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {auto('Manage customer feedback and respond to reviews', 'header.subtitle')}
              </p>
            </div>
            <Link
              href="/marketplace/seller-central"
              className="px-4 py-2 border rounded-lg hover:bg-white"
            >
              {auto('Back to Dashboard', 'actions.back')}
            </Link>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-warning/10 rounded-lg">
                  <Star className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {auto('Average Rating', 'stats.averageRating')}
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    {auto('Total Reviews', 'stats.totalReviews')}
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    {auto('Response Rate', 'stats.responseRate')}
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    {auto('Pending Responses', 'stats.pendingResponses')}
                  </p>
                  <p className="text-2xl font-bold">{stats.pendingResponses}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-1 mb-6 flex gap-1">
          {statusTabs.map((tab) => (
            <Link
              key={tab}
              href={`?status=${tab}`}
              className={`flex-1 px-4 py-2 text-center rounded-lg transition-colors ${
                status === tab ? 'bg-primary text-white' : 'hover:bg-gray-50'
              }`}
            >
              {auto(tab.charAt(0).toUpperCase() + tab.slice(1), `tabs.${tab}`)}
            </Link>
          ))}
        </div>

        <div className="space-y-4">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <div key={review.reviewId}>
                <ReviewCard review={review} showSellerResponse />
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
              <p className="text-muted-foreground">
                {auto('No reviews found', 'state.empty')}
              </p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {page > 1 && (
              <Link
                href={`?status=${status}&page=${page - 1}`}
                className="px-4 py-2 border rounded-lg hover:bg-white"
              >
                {auto('Previous', 'pagination.previous')}
              </Link>
            )}
            <span className="text-sm text-muted-foreground">
              {auto('Page {{page}} of {{total}}', 'pagination.summary')
                .replace('{{page}}', String(page))
                .replace('{{total}}', String(totalPages))}
            </span>
            {page < totalPages && (
              <Link
                href={`?status=${status}&page=${page + 1}`}
                className="px-4 py-2 border rounded-lg hover:bg-white"
              >
                {auto('Next', 'pagination.next')}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
