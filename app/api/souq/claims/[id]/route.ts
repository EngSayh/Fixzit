import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ClaimService } from '@/services/souq/claims/claim-service';

/**
 * GET /api/souq/claims/[id]
 * Get claim details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const claim = await ClaimService.getClaim(params.id);
    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    // Check ownership
    if (claim.buyerId !== session.user.id && claim.sellerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ claim });
  } catch (error) {
    console.error('[Claims API] Get claim failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to get claim',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/souq/claims/[id]
 * Update claim status
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    const claim = await ClaimService.getClaim(params.id);
    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    // Only buyer can withdraw
    if (status === 'withdrawn' && claim.buyerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await ClaimService.updateStatus(params.id, status);

    return NextResponse.json({ success: true, message: 'Claim status updated' });
  } catch (error) {
    console.error('[Claims API] Update claim failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to update claim',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
