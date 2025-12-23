/**
 * RatingSummary Component - Overall rating statistics
 */
"use client";

import React from "react";
import { Star } from "@/components/ui/icons";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

export interface RatingStats {
  averageRating: number;
  totalReviews: number;
  distribution: {
    5: { count: number; percentage: number };
    4: { count: number; percentage: number };
    3: { count: number; percentage: number };
    2: { count: number; percentage: number };
    1: { count: number; percentage: number };
  };
  verifiedPurchasePercentage?: number;
}

interface RatingSummaryProps {
  stats: RatingStats;
  showVerified?: boolean;
}

export function RatingSummary({
  stats,
  showVerified = true,
}: RatingSummaryProps) {
  const {
    averageRating,
    totalReviews,
    distribution,
    verifiedPurchasePercentage,
  } = stats;
  const auto = useAutoTranslator("seller.ratingSummary");
  const reviewLabel =
    totalReviews === 1
      ? auto("review", "reviews.single")
      : auto("reviews", "reviews.plural");

  return (
    <div className="bg-white border rounded-lg p-6">
      {/* Overall Rating */}
      <div className="flex items-center gap-6 mb-6 pb-6 border-b">
        <div className="text-center">
          <div className="text-5xl font-bold text-primary mb-2">
            {averageRating.toFixed(1)}
          </div>
          <div className="flex justify-center mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(averageRating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            {auto("{{count}} {{label}}", "reviews.summary")
              .replace("{{count}}", totalReviews.toLocaleString())
              .replace("{{label}}", reviewLabel)}
          </div>
        </div>

        {/* Distribution Bars */}
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const ratingKey = rating as 5 | 4 | 3 | 2 | 1;
            const data = distribution[ratingKey];
            const percentage = data?.percentage || 0;

            return (
              <div key={rating} className="flex items-center gap-3">
                <span className="text-sm font-medium w-12">
                  {auto("{{rating}} star", "distribution.label").replace(
                    "{{rating}}",
                    String(rating),
                  )}
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-yellow-400 h-2.5 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12 text-end">
                  {percentage}%
                </span>
                <span className="text-sm text-muted-foreground w-12 text-end">
                  ({data?.count || 0})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verified Purchase Badge */}
      {showVerified && verifiedPurchasePercentage !== undefined && (
        <div className="flex items-center gap-2 text-sm">
          <div className="bg-success/10 text-success-dark px-3 py-1 rounded-full font-medium">
            {auto(
              "{{percentage}}% Verified Purchases",
              "verified.badge",
            ).replace("{{percentage}}", String(verifiedPurchasePercentage))}
          </div>
          <span className="text-muted-foreground">
            {auto("Reviews from confirmed buyers", "verified.caption")}
          </span>
        </div>
      )}
    </div>
  );
}
