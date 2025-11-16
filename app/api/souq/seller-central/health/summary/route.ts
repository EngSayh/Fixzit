import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { accountHealthService } from '@/services/souq/account-health-service';

/**
 * GET /api/souq/seller-central/health/summary
 * Get comprehensive account health summary with trends and recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get health summary
    const summary = await accountHealthService.getHealthSummary(session.user.id);

    return NextResponse.json({ 
      success: true,
      ...summary
    });

  } catch (error) {
    console.error('Get health summary error:', error);
    return NextResponse.json({ 
      error: 'Failed to get health summary',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
