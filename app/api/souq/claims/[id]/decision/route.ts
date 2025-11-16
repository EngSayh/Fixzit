import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ClaimService } from '@/services/souq/claims/claim-service';
import { RefundProcessor } from '@/services/souq/claims/refund-processor';
import { SouqOrder } from '@/server/models/souq/Order';

/**
 * POST /api/souq/claims/[id]/decision
 * Make decision on claim (admin only)
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

    const role = session.user.role ?? '';
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'CLAIMS_ADMIN'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { outcome, reason, refundAmount } = body;

    if (!outcome || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: outcome, reason' },
        { status: 400 }
      );
    }

    const validOutcomes = ['refund_full', 'refund_partial', 'replacement', 'reject', 'needs_more_info'];
    if (!validOutcomes.includes(outcome)) {
      return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 });
    }

    if ((outcome === 'refund_full' || outcome === 'refund_partial') && !refundAmount) {
      return NextResponse.json(
        { error: 'Refund amount required for refund outcomes' },
        { status: 400 }
      );
    }

    const claim = await ClaimService.getClaim(params.id);
    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const order = await SouqOrder.findOne({ orderId: claim.orderId }).lean();
    if (!order) {
      return NextResponse.json({ error: 'Order not found for claim' }, { status: 400 });
    }

    // Make decision
    await ClaimService.makeDecision({
      claimId: params.id,
      decidedBy: 'admin',
      decidedByUserId: session.user.id,
      outcome,
      reason,
      refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
    });

    // Process refund if applicable
    if ((outcome === 'refund_full' || outcome === 'refund_partial') && refundAmount) {
      const paymentMethod = order.payment?.method || 'card';
      const transactionId = order.payment?.transactionId;

      if (!transactionId && paymentMethod === 'card') {
        return NextResponse.json(
          { error: 'Original transaction reference missing; refund cannot be processed' },
          { status: 400 }
        );
      }

      if (paymentMethod !== 'card') {
        return NextResponse.json(
          { error: `Refunds are only supported for card payments. Payment method: ${paymentMethod}` },
          { status: 400 }
        );
      }

      try {
        await RefundProcessor.processRefund({
          claimId: params.id,
          orderId: claim.orderId,
          buyerId: claim.buyerId,
          sellerId: claim.sellerId,
          amount: parseFloat(refundAmount),
          reason: `Claim ${params.id}: ${reason}`,
          originalPaymentMethod: paymentMethod,
          originalTransactionId: transactionId ?? undefined,
        });
      } catch (error) {
        console.error('[Claims API] Refund processing failed:', error);
        // Decision was made, but refund failed - this should be handled separately
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Decision recorded successfully',
    });
  } catch (error) {
    console.error('[Claims API] Make decision failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to make decision',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
