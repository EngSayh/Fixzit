import { NextRequest, NextResponse } from 'next/server';
import { AuctionEngine } from '@/services/souq/ads/auction-engine';
import { logger } from '@/lib/logger';

/**
 * POST /api/souq/ads/impressions
 * Track ad impression
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { bidId, campaignId, query, category, productId } = body;

    if (!bidId || !campaignId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: bidId, campaignId' },
        { status: 400 }
      );
    }

    await AuctionEngine.recordImpression(
      bidId,
      campaignId,
      {
        query,
        category,
        productId,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Impression recorded',
    });
  } catch (error) {
    logger.error('[Ad API] Record impression failed:, { error });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record impression',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
