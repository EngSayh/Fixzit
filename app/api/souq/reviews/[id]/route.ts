/**
 * GET /api/souq/reviews/[id] - Get review details
 * PUT /api/souq/reviews/[id] - Update review
 * DELETE /api/souq/reviews/[id] - Delete review
 */
import { NextRequest, NextResponse } from "next/server";
import { reviewService } from "@/services/souq/reviews/review-service";
import { auth } from "@/auth";
import { connectDb } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";
import { z } from "zod";
import { logger } from "@/lib/logger";

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
  try {
    const session = await auth();
    const { id: reviewId } = await context.params;
    // Fetch orgId first to enforce tenant isolation on subsequent fetch
    const { connection } = await connectDb();
    const db = connection.db!;
    const found = await db.collection(COLLECTIONS.SOUQ_REVIEWS).findOne(
      { reviewId },
      { projection: { orgId: 1, org_id: 1, customerId: 1, status: 1 } },
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

    // If requester is authenticated with an org, enforce org match
    const requesterOrg = session?.user?.orgId;
    if (requesterOrg && orgId && requesterOrg !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const review = await reviewService.getReviewById(reviewId, orgId || requesterOrg || "");

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
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connection = await connectDb();
    const { id: reviewId } = await context.params;
    const db = connection.connection.db!;
    const found = await db.collection(COLLECTIONS.SOUQ_REVIEWS).findOne(
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
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connection = await connectDb();
    const { id: reviewId } = await context.params;
    const db = connection.connection.db!;
    const found = await db.collection(COLLECTIONS.SOUQ_REVIEWS).findOne(
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
