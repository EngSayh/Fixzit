/**
 * @description Manages individual product reviews in Souq marketplace.
 * GET retrieves review details. PUT updates review content.
 * DELETE removes review (author or admin only).
 * @route GET /api/souq/reviews/[id] - Get review details
 * @route PUT /api/souq/reviews/[id] - Update review
 * @route DELETE /api/souq/reviews/[id] - Delete review
 * @access Private - Review author or admin
 * @param {string} id - Review ID
 * @returns {Object} review: review details or updated review
 * @throws {400} If no updates provided
 * @throws {401} If user is not authenticated
 * @throws {403} If user is not review author
 * @throws {404} If review not found
 */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { reviewService } from "@/services/souq/reviews/review-service";
import { auth } from "@/auth";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ObjectId } from "mongodb";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const reviewUpdateSchema = z
  .object({
    title: z.string().min(3).max(200).optional(),
    content: z.string().min(10).max(5000).optional(),
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
  })
  .refine(
    (data) =>
      data.title || data.content || data.pros || data.cons || data.images,
    { message: "No updates provided" },
  );

export async function GET(req: NextRequest, context: RouteContext) {
  // Rate limiting: 120 requests per minute per IP for review details
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "souq-reviews:get",
    requests: 120,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    const { id: reviewId } = await context.params;
    
    // [FIXZIT-API-REVIEW-001] Validate ObjectId before database operation
    if (!reviewId || !mongoose.isValidObjectId(reviewId)) {
      return NextResponse.json(
        { error: "Invalid review ID format" },
        { status: 400 }
      );
    }
    
    const searchParams = new URL(req.url).searchParams;
    const orgIdParam = searchParams.get("orgId") ?? session?.user?.orgId ?? "";
    if (!orgIdParam) {
      return NextResponse.json({ error: "Organization context required" }, { status: 400 });
    }
    if (!ObjectId.isValid(orgIdParam)) {
      return NextResponse.json({ error: "Invalid organization id" }, { status: 400 });
    }
    const requesterOrg = session?.user?.orgId;
    if (requesterOrg && requesterOrg !== orgIdParam) {
      // Avoid cross-tenant existence leak
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // TD-001: Migrated from db.collection() to Mongoose model via service
    // Use service method for org-scoped existence check
    const basicInfo = await reviewService.getReviewBasicInfo(reviewId, orgIdParam);
    if (!basicInfo) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Enforce org match with requester
    if (requesterOrg && basicInfo.orgId && requesterOrg !== basicInfo.orgId) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const review = await reviewService.getReviewById(reviewId, orgIdParam);

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const ownerId =
      typeof review.customerId === "string"
        ? review.customerId
        : (review.customerId?.toString?.() ?? "");

    if (review.status !== "published" && session?.user?.id !== ownerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(review);
  } catch (error) {
    logger.error("[GET /api/souq/reviews/[id]]", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch review" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  // Rate limiting: 30 requests per minute per IP for review updates
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "souq-reviews:update",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: reviewId } = await context.params;
    const orgIdParam = new URL(req.url).searchParams.get("orgId") ?? session.user.orgId ?? "";
    if (!orgIdParam) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }
    
    // TD-001: Migrated from db.collection() to Mongoose model via service
    const basicInfo = await reviewService.getReviewBasicInfo(reviewId, orgIdParam);
    if (!basicInfo) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    const orgId = basicInfo.orgId;
    const requesterOrg = session.user.orgId;
    if (requesterOrg && orgId && requesterOrg !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const payload = reviewUpdateSchema.parse(body);

    const review = await reviewService.updateReview(
      reviewId,
      orgId || requesterOrg || "",
      session.user.id,
      payload,
    );

    return NextResponse.json(review);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }

    logger.error("[PUT /api/souq/reviews/[id]]", error as Error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update review",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  // Rate limiting: 20 requests per minute per IP for review deletions
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "souq-reviews:delete",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: reviewId } = await context.params;
    const orgIdParam = new URL(req.url).searchParams.get("orgId") ?? session.user.orgId ?? "";
    if (!orgIdParam) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }
    
    // TD-001: Migrated from db.collection() to Mongoose model via service
    const basicInfo = await reviewService.getReviewBasicInfo(reviewId, orgIdParam);
    if (!basicInfo) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    const orgId = basicInfo.orgId;
    const requesterOrg = session.user.orgId;
    if (requesterOrg && orgId && requesterOrg !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await reviewService.deleteReview(reviewId, orgId || requesterOrg || "", session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[DELETE /api/souq/reviews/[id]]", error as Error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete review",
      },
      { status: 500 },
    );
  }
}
