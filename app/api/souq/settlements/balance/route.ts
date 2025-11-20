/**
 * Balance API
 * GET /api/souq/settlements/balance - Get seller balance (available, reserved, pending)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import { SellerBalanceService } from '@/services/souq/settlements/balance-service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId') || (session.user.id as string);

    // Authorization: Seller can only view own balance, admin can view all
    const userRole = (session.user as { role?: string }).role;
    if (
      userRole !== 'ADMIN' &&
      userRole !== 'SUPER_ADMIN' &&
      sellerId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get balance
    const balance = await SellerBalanceService.getBalance(sellerId);

    return NextResponse.json({ balance });
  } catch (error) {
    logger.error('Error fetching balance', { error });
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
