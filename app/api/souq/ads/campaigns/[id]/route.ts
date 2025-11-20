import { NextRequest, NextResponse } from 'next/server';
import { CampaignService } from '@/services/souq/ads/campaign-service';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';

/**
 * GET /api/souq/ads/campaigns/[id]
 * Get campaign details
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

    const campaign = await CampaignService.getCampaign(params.id);
    
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (campaign.sellerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    logger.error('[Ad API] Get campaign failed', { error });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get campaign',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/souq/ads/campaigns/[id]
 * Update campaign
 */
export async function PUT(
  request: NextRequest,
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

    const body = await request.json();
    
    const updates: {
      name?: string;
      dailyBudget?: number;
      startDate?: Date;
      endDate?: Date;
      status?: 'active' | 'paused' | 'ended';
      biddingStrategy?: 'manual' | 'automatic';
      defaultBid?: number;
    } = {};

    if (body.name) updates.name = body.name;
    if (body.dailyBudget) updates.dailyBudget = parseFloat(body.dailyBudget);
    if (body.startDate) updates.startDate = new Date(body.startDate);
    if (body.endDate) updates.endDate = new Date(body.endDate);
    if (body.status) updates.status = body.status;
    if (body.biddingStrategy) updates.biddingStrategy = body.biddingStrategy;
    if (body.defaultBid) updates.defaultBid = parseFloat(body.defaultBid);

    const updated = await CampaignService.updateCampaign(params.id, updates);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('[Ad API] Update campaign failed', { error });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update campaign',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/souq/ads/campaigns/[id]
 * Delete campaign
 */
export async function DELETE(
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

    await CampaignService.deleteCampaign(params.id);

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    logger.error('[Ad API] Delete campaign failed', { error });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete campaign',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
