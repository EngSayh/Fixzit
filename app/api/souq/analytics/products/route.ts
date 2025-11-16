import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { analyticsService } from '@/services/souq/analytics/analytics-service';

/**
 * GET /api/souq/analytics/products
 * Get product performance metrics for seller
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') ?? 'last_30_days') as 'last_7_days' | 'last_30_days' | 'last_90_days';

    const products = await analyticsService.getProductPerformance(session.user.id, period);

    return NextResponse.json({ 
      success: true,
      ...products
    });

  } catch (error) {
    console.error('Get product performance error:', error);
    return NextResponse.json({ 
      error: 'Failed to get product performance',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
