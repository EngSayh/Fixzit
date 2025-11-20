/**
 * Request Payout API
 * POST /api/souq/settlements/request-payout - Request withdrawal for available balance
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import { SellerBalanceService } from '@/services/souq/settlements/balance-service';
import { PayoutProcessorService } from '@/services/souq/settlements/payout-processor';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, statementId, bankAccount } = body;

    if (!amount || !bankAccount || !bankAccount.iban) {
      return NextResponse.json(
        { error: 'amount and bankAccount with iban are required' },
        { status: 400 }
      );
    }

    const sellerId = session.user.id as string;

    // Validate seller has sufficient balance
    const balance = await SellerBalanceService.getBalance(sellerId);

    if (amount > balance.available) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ${balance.available} SAR` },
        { status: 400 }
      );
    }

    // Request payout
    const payout = await PayoutProcessorService.requestPayout(
      sellerId,
      statementId,
      bankAccount
    );

    return NextResponse.json({ payout }, { status: 201 });
  } catch (error) {
    logger.error('Error requesting payout:, { error });
    const message = error instanceof Error ? error.message : 'Failed to request payout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
