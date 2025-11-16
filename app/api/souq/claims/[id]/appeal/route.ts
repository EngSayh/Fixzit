import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ClaimService } from '@/services/souq/claims/claim-service';

/**
 * POST /api/souq/claims/[id]/appeal
 * File appeal on claim decision
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reason, evidence } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Missing required field: reason' },
        { status: 400 }
      );
    }

    const claim = await ClaimService.getClaim(params.id);
    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    // Determine who is appealing
    let appealedBy: 'buyer' | 'seller';
    if (claim.buyerId === session.user.id) {
      appealedBy = 'buyer';
    } else if (claim.sellerId === session.user.id) {
      appealedBy = 'seller';
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await ClaimService.fileAppeal(params.id, appealedBy, reason, evidence || []);

    return NextResponse.json({
      success: true,
      message: 'Appeal submitted successfully',
    });
  } catch (error) {
    console.error('[Claims API] File appeal failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to file appeal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
