import { NextRequest, NextResponse } from 'next/server';
import { CampaignService } from '@/services/souq/ads/campaign-service';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId') || undefined;
    const start = searchParams.get('start') || undefined;
    const end = searchParams.get('end') || undefined;

    const report = await CampaignService.getPerformanceReport({
      sellerId: session.user.id,
      campaignId: campaignId === 'all' ? undefined : campaignId,
      startDate: start || undefined,
      endDate: end || undefined,
    });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('[Ad API] Get performance report failed:, { error });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load performance report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
