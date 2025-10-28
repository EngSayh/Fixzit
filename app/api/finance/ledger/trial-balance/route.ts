/**
 * Trial Balance API Route - Finance Pack Phase 2
 * 
 * Endpoint:
 * - GET /api/finance/ledger/trial-balance - Get trial balance report
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { authOptions } from '@/auth';
import { dbConnect } from '@/lib/mongodb-unified';
import LedgerEntry from '@/server/models/finance/LedgerEntry';
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
// GET /api/finance/ledger/trial-balance - Get trial balance report
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    // Auth check
    const user = await getUserSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Set tenant context
    setTenantContext({ orgId: user.orgId });
    
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const period = parseInt(searchParams.get('period') || '12'); // 1-12
    const asOfDateParam = searchParams.get('asOfDate');
    
    // Determine as-of date
    let asOfDate: Date;
    if (asOfDateParam) {
      asOfDate = new Date(asOfDateParam);
    } else {
      // Default: last day of the specified period
      asOfDate = new Date(year, period, 0); // Day 0 = last day of previous month
    }
    
    // Get trial balance from LedgerEntry model
    const trialBalance = await LedgerEntry.getTrialBalance(
      new Types.ObjectId(user.orgId),
      year,
      period
    );
    
    // Calculate totals
    const totalDebits = trialBalance.reduce((sum, account) => sum + account.totalDebits, 0);
    const totalCredits = trialBalance.reduce((sum, account) => sum + account.totalCredits, 0);
    const totalBalance = totalDebits - totalCredits;
    
    // Group by account type
    const byType: Record<string, typeof trialBalance> = {};
    trialBalance.forEach(account => {
      if (!byType[account.accountType]) {
        byType[account.accountType] = [];
      }
      byType[account.accountType].push(account);
    });
    
    return NextResponse.json({
      success: true,
      data: {
        asOfDate,
        year,
        period,
        accounts: trialBalance,
        byType,
        totals: {
          debits: totalDebits,
          credits: totalCredits,
          balance: totalBalance,
          isBalanced: Math.abs(totalBalance) < 0.01 // Allow for rounding
        }
      }
    });
    
  } catch (error) {
    console.error('GET /api/finance/ledger/trial-balance error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
