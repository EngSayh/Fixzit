"use client";

/**
 * ReviewList Component - Paginated list of reviews with filters
 */

import React, { useState, useEffect } from "react";
import { ReviewCard } from "./ReviewCard";
import type { IReview } from "@/server/models/souq/Review";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { logger } from "@/lib/logger";

interface ReviewListProps {
  productId?: string;
  initialReviews?: IReview[];
  onMarkHelpful?: (_reviewId: string) => Promise<void>;
  onReport?: (_reviewId: string, _reason: string) => Promise<void>;
}

interface FilterState {
  rating: number | null;
  verifiedOnly: boolean;
  sortBy: "recent" | "helpful" | "rating";
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
    sortBy: "recent",
  });
  const auto = useAutoTranslator("seller.reviewList");

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
        limit: "20",
        sortBy: filters.sortBy,
      });

      if (filters.rating) params.append("rating", filters.rating.toString());
      if (filters.verifiedOnly) params.append("verifiedOnly", "true");

      const response = await fetch(
        `/api/souq/reviews?productId=${productId}&${params}`,
      );
      const data = await response.json();

      setReviews(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      logger.error("Failed to fetch reviews", error, {
        component: "ReviewList",
        action: "fetchReviews",
        productId,
      });
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
          <label className="block text-sm font-medium mb-2">
            {auto("Filter by Rating", "filters.ratingLabel")}
          </label>
          <select
            value={filters.rating || ""}
            onChange={(e) =>
              handleFilterChange({
                rating: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">
              {auto("All Ratings", "filters.allRatings")}
            </option>
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {auto("{{count}} Stars", "filters.ratingOption").replace(
                  "{{count}}",
                  String(value),
                )}
              </option>
            ))}
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
            <span className="text-sm">
              {auto("Verified Purchases Only", "filters.verifiedOnly")}
            </span>
          </label>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {auto("Sort By", "filters.sortLabel")}
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) =>
              handleFilterChange({
                sortBy: e.target.value as "recent" | "helpful" | "rating",
              })
            }
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="recent">
              {auto("Most Recent", "filters.sort.recent")}
            </option>
            <option value="helpful">
              {auto("Most Helpful", "filters.sort.helpful")}
            </option>
            <option value="rating">
              {auto("Highest Rating", "filters.sort.rating")}
            </option>
          </select>
        </div>
      </div>

      {/* Reviews */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-muted-foreground">
            {auto("Loading reviews...", "state.loading")}
          </p>
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
          <p className="text-muted-foreground">
            {auto("No reviews found", "state.empty")}
          </p>
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
            {auto("Previous", "pagination.previous")}
          </button>
          <span className="text-sm text-muted-foreground">
            {auto("Page {{page}} of {{total}}", "pagination.summary")
              .replace("{{page}}", String(page))
              .replace("{{total}}", String(totalPages))}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || loading}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {auto("Next", "pagination.next")}
          </button>
        </div>
      )}
    </div>
  );
}
