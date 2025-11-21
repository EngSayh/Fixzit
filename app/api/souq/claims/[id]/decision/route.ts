import { NextRequest, NextResponse } from 'next/server';
import { ClaimService } from '@/services/souq/claims/claim-service';
import { resolveRequestSession } from '@/lib/auth/request-session';
import { getDatabase } from '@/lib/mongodb-unified';
import { ObjectId } from 'mongodb';
import { logger } from '@/lib/logger';

interface CounterEvidenceEntry {
  type?: string;
  [key: string]: unknown;
}

/**
 * POST /api/souq/claims/[id]/decision
 * Make decision on claim (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await resolveRequestSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();
    const adminRecord = ObjectId.isValid(session.user.id)
      ? await db.collection('users').findOne({ _id: new ObjectId(session.user.id) })
      : await db.collection('users').findOne({ id: session.user.id });

    const role = (adminRecord?.role || session.user.role || '').toUpperCase();
    const allowedRoles = ['ADMIN', 'SUPERADMIN', 'CLAIMS_ADMIN'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const decisionRaw = body.decision ? String(body.decision).toLowerCase() : '';
    const reasoning = body.reasoning ? String(body.reasoning).trim() : '';
    const refundAmountInput = body.refundAmount;

    if (!decisionRaw || !reasoning) {
      return NextResponse.json(
        { error: 'Missing required fields: decision, reasoning' },
        { status: 400 }
      );
    }

    const claim = await ClaimService.getClaim(params.id);
    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const filter = ObjectId.isValid(params.id)
      ? { _id: new ObjectId(params.id) }
      : { claimId: params.id };

    let status: string;
    let refundAmountNumber: number;

    if (decisionRaw === 'approve') {
      const fallbackAmount =
        typeof claim.refundAmount === 'number'
          ? claim.refundAmount
          : Number(claim.requestedAmount ?? claim.orderAmount ?? 0);
      refundAmountNumber =
        typeof refundAmountInput === 'number'
          ? refundAmountInput
          : Number(refundAmountInput ?? fallbackAmount);
      status = 'approved';
    } else if (decisionRaw === 'reject') {
      status = 'rejected';
      refundAmountNumber = 0;
    } else {
      return NextResponse.json({ error: 'Unsupported decision' }, { status: 400 });
    }

    const counterEvidence = claim.sellerResponse?.counterEvidence;
    let sellerProtected = false;
    if (Array.isArray(counterEvidence)) {
      const entries = counterEvidence as unknown as CounterEvidenceEntry[];
      const evidenceTypes = entries.map((entry) =>
        (entry?.type || '').toString().toLowerCase()
      );
      sellerProtected = evidenceTypes.includes('tracking') && evidenceTypes.includes('signature');
    }

    const decisionRecord = {
      outcome: decisionRaw,
      reasoning,
      refundAmount: refundAmountNumber,
      decidedAt: new Date(),
      decidedBy: session.user.id,
    };

    await db.collection('claims').updateOne(filter, {
      $set: {
        status,
        refundAmount: refundAmountNumber,
        decision: decisionRecord,
        sellerProtected,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      status,
      refundAmount: refundAmountNumber,
      sellerProtected,
    });
  } catch (error) {
    logger.error('[Claims API] Make decision failed', { error });
    return NextResponse.json(
      {
        error: 'Failed to make decision',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
