/**
 * GET /api/souq/seller-central/reviews - Get seller reviews
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

    const result = await reviewService.getSellerReviews(session.user.id, {
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

    logger.error("[GET /api/souq/seller-central/reviews]", { error });
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 },
    );
  }
}
