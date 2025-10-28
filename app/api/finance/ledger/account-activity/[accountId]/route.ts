/**
 * Account Activity API Route - Finance Pack Phase 2
 * 
 * Endpoint:
 * - GET /api/finance/ledger/account-activity/[accountId] - Get transaction history for account
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { authOptions } from '@/auth';
import { dbConnect } from '@/lib/mongodb-unified';
import LedgerEntry from '@/server/models/finance/LedgerEntry';
import ChartAccount from '@/server/models/finance/ChartAccount';
import { setTenantContext } from '@/server/plugins/tenantIsolation';
import { Types } from 'mongoose';

// ============================================================================
// HELPER: Get User Session
// ============================================================================

async function getUserSession(_req: NextRequest) {
  const user = await getSessionUser(_req);
  
  if (!user) {
    return null;
  }
  
  return {
    userId: user.id || '',
    orgId: user.orgId || '',
    email: user.email || '',
    role: user.role || ''
  };
}

// ============================================================================
// GET /api/finance/ledger/account-activity/[accountId] - Account transaction history
// ============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    await dbConnect();
    
    // Auth check
    const user = await getUserSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate account ID
    if (!Types.ObjectId.isValid(params.accountId)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }
    
    // Set tenant context
    setTenantContext({ orgId: user.orgId });
    
    // Check account exists and belongs to org
    const account = await ChartAccount.findOne({
      _id: new Types.ObjectId(params.accountId),
      orgId: new Types.ObjectId(user.orgId)
    });
    
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    // Get account activity from LedgerEntry model
    const activity = await LedgerEntry.getAccountActivity(
      new Types.ObjectId(user.orgId),
      new Types.ObjectId(params.accountId),
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    
    // Apply pagination
    const skip = (page - 1) * limit;
    const paginatedActivity = activity.slice(skip, skip + limit);
    
    // Calculate opening balance (balance before startDate if provided)
    let openingBalance = 0;
    if (startDate) {
      const entriesBeforeStart = await LedgerEntry.find({
        orgId: new Types.ObjectId(user.orgId),
        accountId: new Types.ObjectId(params.accountId),
        date: { $lt: new Date(startDate) }
      }).sort({ date: 1, createdAt: 1 });
      
      openingBalance = entriesBeforeStart.reduce((balance, entry) => {
        return balance + entry.debit - entry.credit;
      }, 0);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        account: {
          _id: account._id,
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountType: account.accountType,
          normalBalance: account.normalBalance
        },
        openingBalance,
        transactions: paginatedActivity,
        pagination: {
          page,
          limit,
          total: activity.length,
          pages: Math.ceil(activity.length / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('GET /api/finance/ledger/account-activity/[accountId] error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
