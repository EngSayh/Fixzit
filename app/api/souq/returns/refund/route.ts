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
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
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

    const validMethods = ['original_payment', 'store_credit', 'bank_transfer'];
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
