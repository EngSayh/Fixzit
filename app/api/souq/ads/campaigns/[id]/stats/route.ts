import { NextRequest, NextResponse } from 'next/server';
import { CampaignService } from '@/services/souq/ads/campaign-service';
import { auth } from '@/auth';

/**
 * GET /api/souq/ads/campaigns/[id]/stats
 * Get campaign performance statistics
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify ownership
    const campaign = await CampaignService.getCampaign(params.id);
    
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.sellerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const stats = await CampaignService.getCampaignStats(params.id);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[Ad API] Get campaign stats failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get campaign stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
