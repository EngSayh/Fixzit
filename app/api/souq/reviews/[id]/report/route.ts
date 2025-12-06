/**
 * POST /api/souq/reviews/[id]/report - Report review
 */
import { NextRequest, NextResponse } from "next/server";
import { reviewService } from "@/services/souq/reviews/review-service";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { connectDb } from "@/lib/mongodb-unified";
import { z } from "zod";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const reportSchema = z.object({
  reason: z.string().min(5).max(500),
});

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connection = await connectDb();

    const { id: reviewId } = await context.params;
    const db = connection.connection.db!;
    const found = await db.collection("souq_reviews").findOne(
      { reviewId },
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
    const requesterOrg = session.user.orgId;
    if (requesterOrg && orgId && requesterOrg !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { reason } = reportSchema.parse(body);

    const review = await reviewService.reportReview(reviewId, orgId || requesterOrg || "", reason);
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
