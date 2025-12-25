/**
 * @description Reports a product review for policy violations.
 * Users can flag inappropriate, fake, or offensive reviews for moderation.
 * Reports are queued for admin review.
 * @route POST /api/souq/reviews/[id]/report
 * @access Private - Authenticated users only
 * @param {string} id - Review ID
 * @param {Object} body.reason - Report reason (5-500 chars)
 * @returns {Object} success: true, message: confirmation
 * @throws {400} If reason is missing or too short
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing
 * @throws {404} If review not found
 */
import { NextRequest, NextResponse } from "next/server";
import { reviewService } from "@/services/souq/reviews/review-service";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const reportSchema = z.object({
  reason: z.string().min(5).max(500),
});

export async function POST(req: NextRequest, context: RouteContext) {
  // Rate limiting: 10 requests per minute per IP for review reports
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "souq-reviews:report",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requesterOrg = session.user.orgId;
    if (!requesterOrg) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    const { id: reviewId } = await context.params;
    
    // TD-001: Migrated from db.collection() to Mongoose model via service
    const basicInfo = await reviewService.getReviewBasicInfo(reviewId, requesterOrg);
    if (!basicInfo) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    const orgId = basicInfo.orgId;

    const body = await req.json();
    const { reason } = reportSchema.parse(body);

    const reporterId = session.user.id;
    if (!reporterId) {
      return NextResponse.json({ error: "User context required" }, { status: 403 });
    }

    const review = await reviewService.reportReview(
      reviewId,
      orgId || requesterOrg || "",
      reporterId,
      reason,
    );
    return NextResponse.json(review);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }

    logger.error("[POST /api/souq/reviews/[id]/report]", error as Error);
    return NextResponse.json(
      { error: "Failed to report review" },
      { status: 500 },
    );
  }
}
