/**
 * POST /api/souq/reviews/[id]/report - Report review
 */
import { NextRequest, NextResponse } from 'next/server';
import { reviewService } from '@/services/souq/reviews/review-service';
import { auth } from '@/auth';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: reviewId } = await context.params;
    const body = await req.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      );
    }

    const review = await reviewService.reportReview(reviewId, reason);
    return NextResponse.json(review);
  } catch (error) {
    console.error('[POST /api/souq/reviews/[id]/report]', error);
    return NextResponse.json(
      { error: 'Failed to report review' },
      { status: 500 }
    );
  }
}
