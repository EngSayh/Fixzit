/**
 * POST /api/souq/seller-central/reviews/[id]/respond - Seller response to review
 */
import { NextRequest, NextResponse } from 'next/server';
import { reviewService } from '@/services/souq/reviews/review-service';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import { connectDb } from '@/lib/mongodb-unified';
import { z } from 'zod';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const sellerResponseSchema = z.object({
  content: z.string().min(10).max(1000),
});

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDb();

    const { id: reviewId } = await context.params;
    const body = await req.json();
    const { content } = sellerResponseSchema.parse(body);

    const review = await reviewService.respondToReview(
      reviewId,
      session.user.id,
      content
    );

    return NextResponse.json(review);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', issues: error.issues },
        { status: 400 }
      );
    }

    logger.error('[POST /api/souq/seller-central/reviews/[id]/respond]', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to respond to review' },
      { status: 500 }
    );
  }
}
