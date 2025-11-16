/**
 * POST /api/souq/reviews/[id]/helpful - Mark review as helpful
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
    const review = await reviewService.markHelpful(reviewId, session.user.id);

    return NextResponse.json(review);
  } catch (error) {
    console.error('[POST /api/souq/reviews/[id]/helpful]', error);
    return NextResponse.json(
      { error: 'Failed to mark review as helpful' },
      { status: 500 }
    );
  }
}
