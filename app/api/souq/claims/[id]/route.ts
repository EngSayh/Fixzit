import { NextRequest, NextResponse } from 'next/server';
import { ClaimService } from '@/services/souq/claims/claim-service';
import { resolveRequestSession } from '@/lib/auth/request-session';
import { getDatabase } from '@/lib/mongodb-unified';
import { ObjectId } from 'mongodb';

/**
 * GET /api/souq/claims/[id]
 * Get claim details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await resolveRequestSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const claim = await ClaimService.getClaim(params.id);
    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    // Check ownership
    const buyerMatches = claim.buyerId && String(claim.buyerId) === session.user.id;
    const sellerMatches = claim.sellerId && String(claim.sellerId) === session.user.id;
    if (!buyerMatches && !sellerMatches) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDatabase();
    const orderIdValue = String(claim.orderId);
    let order = null;
    if (ObjectId.isValid(orderIdValue)) {
      order = await db.collection('orders').findOne({ _id: new ObjectId(orderIdValue) }).catch(() => null);
    }
    if (!order) {
      order = await db.collection('orders').findOne({ orderId: orderIdValue }).catch(() => null);
    }

    const buyerDoc = ObjectId.isValid(String(claim.buyerId))
      ? await db.collection('users').findOne({ _id: new ObjectId(String(claim.buyerId)) }).catch(() => null)
      : null;
    const sellerDoc = ObjectId.isValid(String(claim.sellerId))
      ? await db.collection('users').findOne({ _id: new ObjectId(String(claim.sellerId)) }).catch(() => null)
      : null;

    return NextResponse.json({
      ...claim,
      _id: claim._id?.toString?.() ?? claim._id,
      order,
      buyer: buyerDoc,
      seller: sellerDoc,
    });
  } catch (error) {
    logger.error('[Claims API] Get claim failed', { error });
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
    const session = await resolveRequestSession(request);
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
    logger.error('[Claims API] Update claim failed', { error });
    return NextResponse.json(
      {
        error: 'Failed to update claim',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
