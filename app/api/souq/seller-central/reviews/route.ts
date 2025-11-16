/**
 * GET /api/souq/seller-central/reviews - Get seller reviews
 */
import { NextRequest, NextResponse } from 'next/server';
import { reviewService } from '@/services/souq/reviews/review-service';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    
    const result = await reviewService.getSellerReviews(session.user.id, {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      rating: searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : undefined,
      verifiedOnly: searchParams.get('verifiedOnly') === 'true',
      sortBy: (searchParams.get('sortBy') as 'recent' | 'helpful' | 'rating') || 'recent',
      status: (searchParams.get('status') as 'pending' | 'published' | 'rejected' | 'flagged') || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET /api/souq/seller-central/reviews]', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
