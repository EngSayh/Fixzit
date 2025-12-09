"use client";

import { useMemo } from "react";
import { Star } from "lucide-react";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

interface Review {
  _id: string;
  rating: number;
  title?: string;
  comment?: string;
  createdAt?: string;
  author?: {
    name?: string;
    verifiedPurchase?: boolean;
  };
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, { count: number; percentage: number }>;
  verifiedPurchasePercentage: number;
}

interface ProductReviewsClientProps {
  productId: string;
  stats: ReviewStats;
  initialReviews: Review[];
}

export function ProductReviewsClient({
  productId,
  stats,
  initialReviews,
}: ProductReviewsClientProps) {
  const distributionEntries = useMemo(
    () =>
      Object.entries(stats.distribution).sort(
        ([a], [b]) => Number(b) - Number(a),
      ),
    [stats.distribution],
  );
  const auto = useAutoTranslator("marketplace.reviews");

  return (
    <section className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {auto("Product #{{id}}", "header.productId", { id: productId })}
        </p>
        <h1 className="text-3xl font-bold text-foreground">
          {auto("Customer Reviews", "header.title")}
        </h1>
        <p className="text-muted-foreground">
          {auto(
            "Verified reviews from Fixzit Souq transactions",
            "header.subtitle",
          )}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border border-border rounded-2xl p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            {auto("Average Rating", "stats.average")}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold text-foreground">
              {stats.averageRating.toFixed(1)}
            </span>
            <div className="flex gap-1 text-yellow-500">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className={`w-5 h-5 ${index < Math.round(stats.averageRating) ? "fill-yellow-500" : "text-muted-foreground"}`}
                />
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {auto("Based on {{count}} reviews", "stats.total", {
              count: stats.totalReviews,
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {auto("{{percent}}% verified purchases", "stats.verified", {
              percent: stats.verifiedPurchasePercentage,
            })}
          </p>
        </div>
        <div className="border border-border rounded-2xl p-4 space-y-3">
          {distributionEntries.map(([stars, data]) => (
            <div key={stars} className="flex items-center gap-3 text-sm">
              <span className="w-6">{stars}★</span>
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${data.percentage}%` }}
                />
              </div>
              <span className="w-12 text-end text-muted-foreground">
                {data.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {initialReviews.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {auto(
              "No reviews yet. Be the first to share your feedback.",
              "empty",
            )}
          </p>
        )}
        {initialReviews.map((review) => (
          <article
            key={review._id}
            className="border border-border rounded-2xl p-4 space-y-2"
          >
            <div className="flex items-center gap-2">
              <div className="flex gap-1 text-yellow-500">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={`w-4 h-4 ${index < review.rating ? "fill-yellow-500" : "text-muted-foreground"}`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {review.author?.name || auto("Anonymous", "review.anonymous")}
                {review.author?.verifiedPurchase && (
                  <span className="ms-2 text-xs text-success">
                    {auto("Verified purchase", "review.verified")}
                  </span>
                )}
              </span>
              {review.createdAt && (
                <span className="text-xs text-muted-foreground ms-auto">
                  {(() => {
                    try {
                      const date = new Date(review.createdAt);
                      if (isNaN(date.getTime())) {
                        return "Unknown date";
                      }
                      return date.toLocaleDateString();
                    } catch {
                      return "Unknown date";
                    }
                  })()}
                </span>
              )}
            </div>
            {review.title && (
              <h3 className="font-semibold text-foreground">{review.title}</h3>
            )}
            <p className="text-sm text-muted-foreground">{review.comment}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
