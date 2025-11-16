/**
 * POST /api/souq/seller-central/reviews/[id]/respond - Seller response to review
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
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Response content is required' },
        { status: 400 }
      );
    }

    const review = await reviewService.respondToReview(
      reviewId,
      session.user.id,
      content
    );

    return NextResponse.json(review);
  } catch (error) {
    console.error('[POST /api/souq/seller-central/reviews/[id]/respond]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to respond to review' },
      { status: 500 }
    );
  }
}
