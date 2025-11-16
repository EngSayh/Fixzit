/**
 * ReviewList Component - Paginated list of reviews with filters
 */
'use client';

import React, { useState, useEffect } from 'react';
import { ReviewCard } from './ReviewCard';
import type { IReview } from '@/server/models/souq/Review';

interface ReviewListProps {
  productId?: string;
  initialReviews?: IReview[];
  onMarkHelpful?: (_reviewId: string) => Promise<void>;
  onReport?: (_reviewId: string, _reason: string) => Promise<void>;
}

interface FilterState {
  rating: number | null;
  verifiedOnly: boolean;
  sortBy: 'recent' | 'helpful' | 'rating';
}

export function ReviewList({
  productId,
  initialReviews = [],
  onMarkHelpful,
  onReport,
}: ReviewListProps) {
  const [reviews, setReviews] = useState<IReview[]>(initialReviews);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    rating: null,
    verifiedOnly: false,
    sortBy: 'recent',
  });

  useEffect(() => {
    if (productId) {
      fetchReviews();
    }
  }, [productId, page, filters]);

  const fetchReviews = async () => {
    if (!productId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy: filters.sortBy,
      });

      if (filters.rating) params.append('rating', filters.rating.toString());
      if (filters.verifiedOnly) params.append('verifiedOnly', 'true');

      const response = await fetch(`/api/souq/reviews?productId=${productId}&${params}`);
      const data = await response.json();

      setReviews(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters({ ...filters, ...newFilters });
    setPage(1); // Reset to first page
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-4 rounded-lg">
        {/* Rating Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">Filter by Rating</label>
          <select
            value={filters.rating || ''}
            onChange={(e) =>
              handleFilterChange({
                rating: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>

        {/* Verified Only */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer mt-6">
            <input
              type="checkbox"
              checked={filters.verifiedOnly}
              onChange={(e) =>
                handleFilterChange({ verifiedOnly: e.target.checked })
              }
              className="w-4 h-4 text-primary"
            />
            <span className="text-sm">Verified Purchases Only</span>
          </label>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium mb-2">Sort By</label>
          <select
            value={filters.sortBy}
            onChange={(e) =>
              handleFilterChange({ sortBy: e.target.value as 'recent' | 'helpful' | 'rating' })
            }
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="recent">Most Recent</option>
            <option value="helpful">Most Helpful</option>
            <option value="rating">Highest Rating</option>
          </select>
        </div>
      </div>

      {/* Reviews */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Loading reviews...</p>
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.reviewId}
              review={review}
              onMarkHelpful={onMarkHelpful}
              onReport={onReport}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">No reviews found</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1 || loading}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || loading}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
