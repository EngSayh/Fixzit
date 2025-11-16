/**
 * GET /api/souq/products/[id]/reviews - Get product reviews with stats
 */
import { NextRequest, NextResponse } from 'next/server';
import { reviewService } from '@/services/souq/reviews/review-service';
import { ratingAggregationService } from '@/services/souq/reviews/rating-aggregation-service';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id: productId } = await context.params;
    const { searchParams } = new URL(req.url);

    // Get reviews
    const reviews = await reviewService.getProductReviews(productId, {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      rating: searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : undefined,
      verifiedOnly: searchParams.get('verifiedOnly') === 'true',
      sortBy: (searchParams.get('sortBy') as 'recent' | 'helpful' | 'rating') || 'recent',
    });

    // Get stats
    const stats = await reviewService.getReviewStats(productId);
    const distribution = await ratingAggregationService.getRatingDistribution(productId);

    return NextResponse.json({
      ...reviews,
      stats,
      distribution,
    });
  } catch (error) {
    console.error('[GET /api/souq/products/[id]/reviews]', error);
    return NextResponse.json(
      { error: 'Failed to fetch product reviews' },
      { status: 500 }
    );
  }
}
