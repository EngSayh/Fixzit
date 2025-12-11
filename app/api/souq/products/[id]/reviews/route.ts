/**
 * @description Retrieves product reviews with aggregated statistics.
 * Returns paginated reviews along with rating breakdown and average score.
 * Supports filtering by rating and verified purchases.
 * @route GET /api/souq/products/[id]/reviews
 * @access Public - Tenant-scoped via product orgId
 * @param {string} id - Product ID
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20, max: 100)
 * @query {number} rating - Filter by star rating (1-5)
 * @query {boolean} verifiedOnly - Filter to verified purchases
 * @query {string} sortBy - Sort order: recent, helpful, rating
 * @returns {Object} reviews: array, stats: rating breakdown, averageRating
 * @throws {404} If product not found or missing orgId
 */
import { NextRequest, NextResponse } from "next/server";
import { reviewService } from "@/services/souq/reviews/review-service";
import { ratingAggregationService } from "@/services/souq/reviews/rating-aggregation-service";
import { connectDb } from "@/lib/mongodb-unified";
import { z } from "zod";
import { logger } from "@/lib/logger";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const productReviewFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  verifiedOnly: z
    .union([z.literal("true"), z.literal("false")])
    .transform((val) => val === "true")
    .optional(),
  sortBy: z.enum(["recent", "helpful", "rating"]).default("recent"),
});

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id: productId } = await context.params;
    const connection = await connectDb();
    const db = connection.connection.db!;
    
    // Fetch product to get orgId for tenant-scoped queries
    const product = await db.collection("souq_products").findOne(
      { productId },
      { projection: { orgId: 1 } }
    );
    const orgId = (product as { orgId?: string })?.orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Product orgId missing; cannot fetch tenant-scoped reviews" },
        { status: 404 },
      );
    }
    
    const { searchParams } = new URL(req.url);
    const filters = productReviewFiltersSchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      rating: searchParams.get("rating") ?? undefined,
      verifiedOnly: searchParams.get("verifiedOnly") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
    });

    // Get reviews
    const reviews = await reviewService.getProductReviews(productId, orgId, {
      page: filters.page,
      limit: filters.limit,
      rating: filters.rating,
      verifiedOnly: filters.verifiedOnly,
      sortBy: filters.sortBy,
    });

    // Get stats
    const stats = await reviewService.getReviewStats(productId, orgId);
    const distribution = await ratingAggregationService.getRatingDistribution(productId, orgId);

    return NextResponse.json({
      ...reviews,
      stats,
      distribution,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }

    logger.error("[GET /api/souq/products/[id]/reviews]", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch product reviews" },
      { status: 500 },
    );
  }
}
