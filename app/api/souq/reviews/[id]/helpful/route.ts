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
import { logger } from "@/lib/logger";
import { connectDb } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";
import { z } from "zod";
import { ObjectId } from "mongodb";

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
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connection = await connectDb();
    const { id: reviewId } = await context.params;
    const requesterOrg = session.user.orgId;
    if (!requesterOrg) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }
    // Fetch orgId for tenant isolation
    const db = connection.connection.db!;
    const orgCandidates = [requesterOrg, new ObjectId(requesterOrg)];
    const found = await db.collection(COLLECTIONS.SOUQ_REVIEWS).findOne(
      { reviewId, $or: [{ orgId: { $in: orgCandidates } }, { org_id: { $in: orgCandidates } }] },
      { projection: { orgId: 1, org_id: 1 } },
    );
    if (!found) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    const orgId =
      typeof found.orgId === "string"
        ? found.orgId
        : typeof found.org_id === "string"
          ? found.org_id
          : found.orgId?.toString?.() ?? found.org_id?.toString?.() ?? "";

    const body = await req.json().catch(() => ({}));
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
