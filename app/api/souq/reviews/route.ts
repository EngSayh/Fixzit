/**
 * @description Manages product reviews in the Souq marketplace.
 * GET lists reviews with filtering by status, rating, and verified purchase.
 * POST creates a new product review with rating, title, content, and optional images.
 * @route GET /api/souq/reviews - List reviews with filters
 * @route POST /api/souq/reviews - Create new product review
 * @access Private - Authenticated buyers for POST
 * @query {string} status - Filter: pending, published, rejected, flagged
 * @query {number} rating - Filter by star rating (1-5)
 * @query {boolean} verifiedOnly - Filter to verified purchases
 * @param {Object} body.productId - Product ID being reviewed
 * @param {Object} body.rating - Star rating (1-5)
 * @param {Object} body.title - Review title
 * @param {Object} body.content - Review content (10-5000 chars)
 * @returns {Object} reviews: array with pagination | created review
 * @throws {400} If validation fails
 * @throws {401} If user is not authenticated (POST)
 */

import { NextResponse } from "next/server";
import { parseBodySafe } from "@/lib/api/parse-body";
import { logger } from "@/lib/logger";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { connectDb } from "@/lib/mongodb-unified";
import { getServerSession } from "@/lib/auth/getServerSession";
import { reviewService } from "@/services/souq/reviews/review-service";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const reviewCreateSchema = z.object({
  productId: z.string().min(1),
  orderId: z.string().min(1).optional(),
  customerName: z.string().min(2).max(120).optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(3).max(200),
  content: z.string().min(10).max(5000),
  pros: z.array(z.string().min(1).max(120)).max(10).optional(),
  cons: z.array(z.string().min(1).max(120)).max(10).optional(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        caption: z.string().max(200).optional(),
      }),
    )
    .max(5)
    .optional(),
});

const reviewListQuerySchema = z.object({
  status: z.enum(["pending", "published", "rejected", "flagged"]).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  verifiedOnly: z
    .union([z.literal("true"), z.literal("false")])
    .transform((val) => val === "true")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function POST(request: NextRequest) {
  // Rate limiting: 20 requests per minute per IP for review submission
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-reviews:create",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 },
      );
    }

    await connectDb();

    const { data: body, error: parseError } = await parseBodySafe<Record<string, unknown>>(request, { logPrefix: "[Souq Reviews]" });
    if (parseError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const payload = reviewCreateSchema.parse(body);

    // SEC-FIX: Require orgId - never fall back to userId to prevent cross-tenant writes
    if (!session.user.orgId) {
      return NextResponse.json(
        { error: "Forbidden", message: "Organization context is required" },
        { status: 403 },
      );
    }
    const orgId = session.user.orgId;
    const review = await reviewService.submitReview(orgId, {
      ...payload,
      customerId: session.user.id,
      customerName:
        payload.customerName ?? session.user.name ?? "Marketplace Customer",
    });

    return NextResponse.json(
      {
        success: true,
        data: review,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }

    logger.error("Review creation error:", error as Error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create review",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP for listing reviews
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-reviews:list",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = reviewListQuerySchema.parse({
      status: searchParams.get("status") ?? undefined,
      rating: searchParams.get("rating") ?? undefined,
      verifiedOnly: searchParams.get("verifiedOnly") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    await connectDb();
    const orgId = session.user.orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    const { reviews, pagination } = await reviewService.listReviews(orgId, {
      customerId: session.user.id,
      status: parsed.status,
      rating: parsed.rating,
      verifiedOnly: parsed.verifiedOnly,
      page: parsed.page,
      limit: parsed.limit,
    });

    return NextResponse.json({
      success: true,
      data: reviews,
      pagination,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }

    logger.error("Review fetch error:", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 },
    );
  }
}
