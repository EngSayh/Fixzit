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

    await connectDb();

    const { id: reviewId } = await context.params;
    const body = await req.json();
    const { reason } = reportSchema.parse(body);

    const review = await reviewService.reportReview(reviewId, reason);
    return NextResponse.json(review);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }

    logger.error("[POST /api/souq/reviews/[id]/report]", { error });
    return NextResponse.json(
      { error: "Failed to report review" },
      { status: 500 },
    );
  }
}
