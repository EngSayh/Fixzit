/**
 * GET /api/souq/reviews/[id] - Get review details
 * PUT /api/souq/reviews/[id] - Update review
 * DELETE /api/souq/reviews/[id] - Delete review
 */
import { NextRequest, NextResponse } from 'next/server';
import { reviewService } from '@/services/souq/reviews/review-service';
import { auth } from '@/auth';
import { connectDb } from '@/lib/mongodb-unified';
import { z } from 'zod';
import { logger } from '@/lib/logger';

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
        })
      )
      .max(5)
      .optional(),
  })
  .refine(
    (data) =>
      data.title ||
      data.content ||
      data.pros ||
      data.cons ||
      data.images,
    { message: 'No updates provided' }
  );

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    await connectDb();
    const { id: reviewId } = await context.params;
    const review = await reviewService.getReviewById(reviewId);

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const ownerId =
      typeof review.customerId === 'string'
        ? review.customerId
        : review.customerId?.toString?.() ?? '';

    if (review.status !== 'published' && session?.user?.id !== ownerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(review);
  } catch (error) {
    logger.error('[GET /api/souq/reviews/[id]]', { error });
    return NextResponse.json(
      { error: 'Failed to fetch review' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDb();

    const { id: reviewId } = await context.params;
    const body = await req.json();
    const payload = reviewUpdateSchema.parse(body);

    const review = await reviewService.updateReview(
      reviewId,
      session.user.id,
      payload
    );

    return NextResponse.json(review);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', issues: error.issues },
        { status: 400 }
      );
    }

    logger.error('[PUT /api/souq/reviews/[id]]', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update review' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDb();

    const { id: reviewId } = await context.params;
    await reviewService.deleteReview(reviewId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[DELETE /api/souq/reviews/[id]]', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete review' },
      { status: 500 }
    );
  }
}
