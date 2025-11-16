/**
 * GET /api/souq/reviews/[id] - Get review details
 * PUT /api/souq/reviews/[id] - Update review
 * DELETE /api/souq/reviews/[id] - Delete review
 */
import { NextRequest, NextResponse } from 'next/server';
import { reviewService } from '@/services/souq/reviews/review-service';
import { auth } from '@/auth';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id: reviewId } = await context.params;
    const review = await reviewService.getReviewById(reviewId);

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error('[GET /api/souq/reviews/[id]]', error);
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

    const { id: reviewId } = await context.params;
    const body = await req.json();
    const { title, content, pros, cons, images } = body;

    const review = await reviewService.updateReview(
      reviewId,
      session.user.id,
      { title, content, pros, cons, images }
    );

    return NextResponse.json(review);
  } catch (error) {
    console.error('[PUT /api/souq/reviews/[id]]', error);
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

    const { id: reviewId } = await context.params;
    await reviewService.deleteReview(reviewId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/souq/reviews/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete review' },
      { status: 500 }
    );
  }
}
