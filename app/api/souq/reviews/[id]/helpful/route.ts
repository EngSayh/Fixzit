/**
 * @description Marks a product review as helpful or not helpful.
 * Users can vote on review helpfulness to surface quality reviews.
 * Each user can only vote once per review.
 * @route POST /api/souq/reviews/[id]/helpful
 * @access Private - Authenticated users only
 * @param {string} id - Review ID
 * @param {Object} body.action - Vote: helpful or not_helpful
 * @returns {Object} success: true, helpfulCount: updated count
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing
 * @throws {404} If review not found
 */
import { NextRequest, NextResponse } from "next/server";
import { reviewService } from "@/services/souq/reviews/review-service";
import { auth } from "@/auth";
import { parseBodySafe } from "@/lib/api/parse-body";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const helpfulActionSchema = z
  .object({
    action: z.enum(["helpful", "not_helpful"]).default("helpful"),
  })
  .default({ action: "helpful" });

export async function POST(req: NextRequest, context: RouteContext) {
  // Rate limiting: 30 requests per minute per IP for helpful votes
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "souq-reviews:helpful",
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
    const requesterOrg = session.user.orgId;
    if (!requesterOrg) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }
    
    // TD-001: Migrated from db.collection() to Mongoose model via service
    const basicInfo = await reviewService.getReviewBasicInfo(reviewId, requesterOrg);
    if (!basicInfo) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    const orgId = basicInfo.orgId;

    const { data: body, error: parseError } = await parseBodySafe(req, { logPrefix: "[souq:reviews:helpful]" });
    if (parseError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { action } = helpfulActionSchema.parse(body ?? {});

    const review =
      action === "not_helpful"
        ? await reviewService.markNotHelpful(reviewId, orgId, session.user.id)
        : await reviewService.markHelpful(reviewId, orgId, session.user.id);

    return NextResponse.json(review);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }

    logger.error("[POST /api/souq/reviews/[id]/helpful]", error as Error);
    return NextResponse.json(
      { error: "Failed to mark review as helpful" },
      { status: 500 },
    );
  }
}
