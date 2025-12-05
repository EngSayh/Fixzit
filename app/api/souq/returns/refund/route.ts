import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import { returnsService } from '@/services/souq/returns-service';

/**
 * POST /api/souq/returns/refund
 * Process refund for inspected return
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin only
    if (!['SUPER_ADMIN', 'CORPORATE_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { rmaId, refundAmount, refundMethod } = body;

    // Validation
    if (!rmaId || !refundAmount || !refundMethod) {
      return NextResponse.json({ 
        error: 'Missing required fields: rmaId, refundAmount, refundMethod' 
      }, { status: 400 });
    }

    // Org boundary enforcement: Verify RMA belongs to the caller's organization (SUPER_ADMIN may cross-org)
    const { SouqRMA } = await import('@/server/models/souq/RMA');
    const rma = await SouqRMA.findById(rmaId).lean();
    if (!rma) {
      return NextResponse.json({ 
        error: 'RMA not found' 
      }, { status: 404 });
    }
    const rmaOrgId = rma.orgId?.toString();
    if (!rmaOrgId) {
      return NextResponse.json({ error: 'RMA missing orgId' }, { status: 400 });
    }

    const sessionOrgId = (session.user as { orgId?: string }).orgId;
    const targetOrgId = session.user.role === 'SUPER_ADMIN'
      ? (sessionOrgId || rmaOrgId)
      : sessionOrgId;

    if (!targetOrgId) {
      return NextResponse.json(
        { error: 'Organization context required' },
        { status: 403 },
      );
    }

    if (session.user.role !== 'SUPER_ADMIN' && rmaOrgId !== targetOrgId) {
      logger.warn('Org boundary violation attempt in refund processing', { 
        userId: session.user.id, 
        userOrg: targetOrgId,
        rmaOrg: rmaOrgId,
        rmaId 
      });
      return NextResponse.json({ 
        error: 'Access denied: RMA belongs to different organization' 
      }, { status: 403 });
    }

    const validMethods = ['original_payment', 'wallet', 'bank_transfer'];
    if (!validMethods.includes(refundMethod)) {
      return NextResponse.json({ 
        error: `Invalid refundMethod. Must be one of: ${validMethods.join(', ')}` 
      }, { status: 400 });
    }

    if (refundAmount <= 0) {
      return NextResponse.json({ 
        error: 'Refund amount must be greater than 0' 
      }, { status: 400 });
    }

    // Process refund
    await returnsService.processRefund({
      rmaId,
      orgId: targetOrgId,
      refundAmount,
      refundMethod,
      processorId: session.user.id
    });

    return NextResponse.json({ 
      success: true,
      message: 'Refund processed successfully'
    });

  } catch (error) {
    logger.error('Process refund error', { error });
    return NextResponse.json({ 
      error: 'Failed to process refund',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
