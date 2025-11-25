/**
 * ReviewCard Component - Display individual review
 */
"use client";

import React, { useState } from "react";
import { Star, ThumbsUp, Flag, MessageSquare } from "lucide-react";
import type { IReview } from "@/server/models/souq/Review";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

interface ReviewCardProps {
  review: IReview;
  onMarkHelpful?: (_reviewId: string) => Promise<void>;
  onReport?: (_reviewId: string, _reason: string) => Promise<void>;
  showSellerResponse?: boolean;
}

export function ReviewCard({
  review,
  onMarkHelpful,
  onReport,
  showSellerResponse = true,
}: ReviewCardProps) {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const auto = useAutoTranslator("seller.reviewCard");

  const handleMarkHelpful = async () => {
    if (!onMarkHelpful) return;
    setIsSubmitting(true);
    try {
      await onMarkHelpful(review.reviewId);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!onReport || !reportReason) return;
    setIsSubmitting(true);
    try {
      await onReport(review.reviewId, reportReason);
      setShowReportDialog(false);
      setReportReason("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="border rounded-lg p-6 bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= review.rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="font-semibold">{review.title}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{review.customerName}</span>
            {review.isVerifiedPurchase && (
              <span className="bg-success/10 text-success-dark px-2 py-0.5 rounded text-xs font-medium">
                {auto("Verified Purchase", "badges.verified")}
              </span>
            )}
            <span>•</span>
            <span>{formatDate(review.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="text-gray-700 mb-4">{review.content}</p>

      {/* Pros & Cons */}
      {((review.pros && review.pros.length > 0) ||
        (review.cons && review.cons.length > 0)) && (
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {review.pros && review.pros.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-success-dark mb-2">
                {auto("Pros", "sections.pros")}
              </h4>
              <ul className="space-y-1">
                {review.pros.map((pro, index) => (
                  <li
                    key={index}
                    className="text-sm text-gray-600 flex items-start gap-2"
                  >
                    <span className="text-success mt-1">+</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {review.cons && review.cons.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-destructive-dark mb-2">
                {auto("Cons", "sections.cons")}
              </h4>
              <ul className="space-y-1">
                {review.cons.map((con, index) => (
                  <li
                    key={index}
                    className="text-sm text-gray-600 flex items-start gap-2"
                  >
                    <span className="text-destructive mt-1">-</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Images */}
      {review.images && review.images.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {review.images.map((image, index) => (
            <img
              key={index}
              src={image.url}
              alt={
                image.caption ||
                auto("Review image {{index}}", "media.alt").replace(
                  "{{index}}",
                  String(index + 1),
                )
              }
              className="w-24 h-24 object-cover rounded-lg border"
            />
          ))}
        </div>
      )}

      {/* Seller Response */}
      {showSellerResponse && review.sellerResponse && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">
              {auto("Seller Response", "sections.sellerResponse")}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(review.sellerResponse.respondedAt)}
            </span>
          </div>
          <p className="text-sm text-gray-700">
            {review.sellerResponse.content}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4 border-t">
        <button
          onClick={handleMarkHelpful}
          disabled={isSubmitting || !onMarkHelpful}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary disabled:opacity-50"
        >
          <ThumbsUp className="w-4 h-4" />
          <span>
            {auto("Helpful ({{count}})", "actions.helpful").replace(
              "{{count}}",
              String(review.helpful),
            )}
          </span>
        </button>

        <button
          onClick={() => setShowReportDialog(true)}
          disabled={!onReport}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-destructive disabled:opacity-50"
        >
          <Flag className="w-4 h-4" />
          <span>{auto("Report", "actions.report")}</span>
        </button>
      </div>

      {/* Report Dialog */}
      {showReportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {auto("Report Review", "dialog.title")}
            </h3>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder={auto(
                "Why are you reporting this review?",
                "dialog.placeholder",
              )}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowReportDialog(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                {auto("Cancel", "dialog.cancel")}
              </button>
              <button
                onClick={handleReport}
                disabled={isSubmitting || !reportReason}
                className="flex-1 px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive-dark disabled:opacity-50"
              >
                {isSubmitting
                  ? auto("Submitting...", "dialog.submitting")
                  : auto("Report", "actions.report")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
