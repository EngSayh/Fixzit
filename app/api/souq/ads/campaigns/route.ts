import { NextRequest, NextResponse } from 'next/server';
import { CampaignService } from '@/services/souq/ads/campaign-service';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';

/**
 * POST /api/souq/ads/campaigns
 * Create new ad campaign
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    const required = ['name', 'type', 'dailyBudget', 'startDate', 'biddingStrategy', 'targeting', 'products'];
    const missing = required.filter(field => !body[field]);
    
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    const campaign = await CampaignService.createCampaign({
      sellerId: session.user.id,
      name: body.name,
      type: body.type,
      dailyBudget: parseFloat(body.dailyBudget),
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      biddingStrategy: body.biddingStrategy,
      defaultBid: body.defaultBid ? parseFloat(body.defaultBid) : undefined,
      targeting: body.targeting,
      products: body.products,
    });

    return NextResponse.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    logger.error('[Ad API] Create campaign failed:, { error });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create campaign',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/souq/ads/campaigns
 * List campaigns for authenticated seller
 */
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
    const status = searchParams.get('status') as 'active' | 'paused' | 'ended' | null;
    const type = searchParams.get('type') as 'sponsored_products' | 'sponsored_brands' | 'product_display' | null;

    const campaigns = await CampaignService.listCampaigns(
      session.user.id,
      {
        status: status || undefined,
        type: type || undefined,
      }
    );

    return NextResponse.json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    logger.error('[Ad API] List campaigns failed', { error });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list campaigns',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
