/**
 * Seller Reviews Dashboard - Manage and respond to product reviews
 * @route /marketplace/seller-central/reviews
 */

import React from "react";
import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { reviewService } from "@/services/souq/reviews/review-service";
import { SellerReviewsDashboard } from "@/components/marketplace/seller-central/SellerReviewsDashboard";
import type { IReview } from "@/server/models/souq/Review";
import type { SellerReview } from "@/lib/souq/review-types";

export const metadata: Metadata = {
  title: "Product Reviews | Seller Central",
  description: "Manage and respond to product reviews",
};

export default async function SellerReviewsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/marketplace/seller-central/reviews");
  }

  // 🔐 STRICT v4.1: Require orgId for tenant isolation
  const orgId = (session.user as { orgId?: string }).orgId;
  if (!orgId) {
    redirect("/login?error=organization_required");
  }

  const params = searchParams ?? {};
  const page = parseInt((params.page as string) || "1", 10);
  const status = (params.status as string) || "published";

  // Fetch seller reviews
  const reviewsData = await reviewService.getSellerReviews(orgId, session.user.id, {
    page,
    limit: 20,
    status: status as "pending" | "published" | "rejected" | "flagged",
  });

  // Get seller stats
  const stats = await reviewService.getSellerReviewStats(orgId, session.user.id);

  const toClientReview = (review: IReview): SellerReview => ({
    reviewId: review.reviewId,
    productId: review.productId?.toString?.(),
    fsin: review.fsin,
    customerName: review.customerName,
    isVerifiedPurchase: review.isVerifiedPurchase,
    rating: review.rating,
    title: review.title,
    content: review.content,
    pros: review.pros,
    cons: review.cons,
    images: review.images,
    helpful: review.helpful,
    notHelpful: review.notHelpful,
    sellerResponse: review.sellerResponse
      ? {
          content: review.sellerResponse.content,
          respondedAt: review.sellerResponse.respondedAt,
          respondedBy: review.sellerResponse.respondedBy.toString(),
        }
      : undefined,
    status: review.status,
    moderationNotes: review.moderationNotes,
    reportedCount: review.reportedCount,
    reportReasons: review.reportReasons,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    publishedAt: review.publishedAt,
  });

  const clientReviews = reviewsData.reviews.map(toClientReview);

  return (
    <SellerReviewsDashboard
      stats={{
        averageRating: stats.averageRating,
        totalReviews: stats.totalReviews,
        responseRate: stats.responseRate,
        pendingResponses: stats.pendingResponses,
      }}
      reviews={clientReviews}
      totalPages={reviewsData.totalPages}
      page={page}
      status={status as "published" | "pending" | "flagged"}
    />
  );
}
