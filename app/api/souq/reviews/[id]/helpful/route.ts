/**
 * POST /api/souq/reviews/[id]/helpful - Mark review as helpful
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

    await connectDb();

    const { id: reviewId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { action } = helpfulActionSchema.parse(body ?? {});

    const review =
      action === "not_helpful"
        ? await reviewService.markNotHelpful(reviewId, session.user.id)
        : await reviewService.markHelpful(reviewId, session.user.id);

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
