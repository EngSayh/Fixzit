import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ClaimService } from '@/services/souq/claims/claim-service';
import { enforceRateLimit } from '@/lib/middleware/rate-limit';

/**
 * POST /api/souq/claims/[id]/response
 * Seller responds to claim
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = enforceRateLimit(request, {
    keyPrefix: 'souq-claims:response',
    requests: 30,
    windowMs: 120_000,
  });
  if (limited) return limited;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { responseText, proposedSolution, partialRefundAmount, evidence } = body;

    if (!responseText || !proposedSolution) {
      return NextResponse.json(
        { error: 'Missing required fields: responseText, proposedSolution' },
        { status: 400 }
      );
    }

    const validSolutions = ['refund_full', 'refund_partial', 'replacement', 'dispute'];
    if (!validSolutions.includes(proposedSolution)) {
      return NextResponse.json(
        { error: 'Invalid proposed solution' },
        { status: 400 }
      );
    }

    if (proposedSolution === 'refund_partial' && !partialRefundAmount) {
      return NextResponse.json(
        { error: 'Partial refund amount required' },
        { status: 400 }
      );
    }

    const claim = await ClaimService.getClaim(params.id);
    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    if (claim.sellerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await ClaimService.addSellerResponse({
      claimId: params.id,
      sellerId: session.user.id,
      responseText,
      proposedSolution,
      partialRefundAmount: partialRefundAmount ? parseFloat(partialRefundAmount) : undefined,
      evidence,
    });

    return NextResponse.json({
      success: true,
      message: 'Response submitted successfully',
    });
  } catch (error) {
    console.error('[Claims API] Seller response failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit response',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
