/**
 * @description Allows sellers to respond to customer reviews.
 * Creates public seller response visible on product reviews.
 * One response per review allowed.
 * @route POST /api/souq/seller-central/reviews/[id]/respond
 * @access Private - Product seller only
 * @param {string} id - Review ID to respond to
 * @param {Object} body.content - Response content (10-1000 chars)
 * @returns {Object} review: updated review with seller response
 * @throws {400} If content validation fails or orgId missing
 * @throws {401} If user is not authenticated
 * @throws {403} If user is not the product seller
 * @throws {404} If review not found
 */
import { NextRequest, NextResponse } from "next/server";
import { reviewService } from "@/services/souq/reviews/review-service";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { connectDb } from "@/lib/mongodb-unified";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const sellerResponseSchema = z.object({
  content: z.string().min(10).max(1000),
});

export async function POST(req: NextRequest, context: RouteContext) {
  // Rate limiting: 20 requests per minute per IP for review responses
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "souq-seller-reviews:respond",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const { id: reviewId } = await context.params;
    const body = await req.json();
    const { content } = sellerResponseSchema.parse(body);

    // 🔐 STRICT v4.1: orgId is required for tenant isolation
    const orgId = session.user.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    const review = await reviewService.respondToReview(
      orgId,
      reviewId,
      session.user.id,
      content,
    );

    return NextResponse.json(review);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }

    logger.error("[POST /api/souq/seller-central/reviews/[id]/respond]", {
      error,
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to respond to review",
      },
      { status: 500 },
    );
  }
}
