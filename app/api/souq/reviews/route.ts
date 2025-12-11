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
import { logger } from "@/lib/logger";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { connectDb } from "@/lib/mongodb-unified";
import { getServerSession } from "@/lib/auth/getServerSession";
import { reviewService } from "@/services/souq/reviews/review-service";
import { SouqReview } from "@/server/models/souq/Review";
import { ObjectId } from "mongodb";

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
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 },
      );
    }

    await connectDb();

    const body = await request.json();
    const payload = reviewCreateSchema.parse(body);

    const orgId = session.user.orgId ?? session.user.id;
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
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 },
      );
    }

    await connectDb();
    const orgId = session.user.orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }
    const orgCandidates = ObjectId.isValid(orgId)
      ? [orgId, new ObjectId(orgId)]
      : [orgId];

    const { searchParams } = new URL(request.url);
    const parsed = reviewListQuerySchema.parse({
      status: searchParams.get("status") ?? undefined,
      rating: searchParams.get("rating") ?? undefined,
      verifiedOnly: searchParams.get("verifiedOnly") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const query: Record<string, unknown> = {
      customerId: session.user.id,
      $or: [{ orgId: { $in: orgCandidates } }, { org_id: { $in: orgCandidates } }],
    };

    if (parsed.status) query.status = parsed.status;
    if (parsed.rating) query.rating = parsed.rating;
    if (parsed.verifiedOnly) query.isVerifiedPurchase = true;

    const skip = (parsed.page - 1) * parsed.limit;
    const [reviews, total] = await Promise.all([
      SouqReview.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsed.limit)
        .lean(),
      SouqReview.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: reviews,
      pagination: {
        page: parsed.page,
        limit: parsed.limit,
        total,
        pages: Math.ceil(total / parsed.limit),
      },
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
