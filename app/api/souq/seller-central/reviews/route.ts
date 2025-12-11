/**
 * @description Retrieves product and seller reviews for Seller Central dashboard.
 * Supports filtering by rating, verified purchase status, and review status.
 * Provides pagination and sorting options for review management.
 * @route GET /api/souq/seller-central/reviews
 * @access Private - Authenticated sellers only
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20, max: 100)
 * @query {number} rating - Filter by star rating (1-5)
 * @query {boolean} verifiedOnly - Filter to verified purchase reviews
 * @query {string} sortBy - Sort order: recent, helpful, rating
 * @query {string} status - Filter by status: pending, published, rejected, flagged
 * @returns {Object} reviews: array, pagination: metadata, aggregates: rating breakdown
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing
 */
import { NextRequest, NextResponse } from "next/server";
import { reviewService } from "@/services/souq/reviews/review-service";
import { auth } from "@/auth";
import { connectDb } from "@/lib/mongodb-unified";
import { z } from "zod";
import { logger } from "@/lib/logger";

const sellerReviewFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  verifiedOnly: z
    .union([z.literal("true"), z.literal("false")])
    .transform((val) => val === "true")
    .optional(),
  sortBy: z.enum(["recent", "helpful", "rating"]).default("recent"),
  status: z.enum(["pending", "published", "rejected", "flagged"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔐 STRICT v4.1: Require orgId for tenant isolation
    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    await connectDb();

    const { searchParams } = new URL(req.url);
    const filters = sellerReviewFiltersSchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      rating: searchParams.get("rating") ?? undefined,
      verifiedOnly: searchParams.get("verifiedOnly") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    const result = await reviewService.getSellerReviews(orgId, session.user.id, {
      page: filters.page,
      limit: filters.limit,
      rating: filters.rating,
      verifiedOnly: filters.verifiedOnly,
      sortBy: filters.sortBy,
      status: filters.status,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }

    logger.error("[GET /api/souq/seller-central/reviews]", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 },
    );
  }
}
