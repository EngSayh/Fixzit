/**
 * Ledger API Routes - Finance Pack Phase 2
 * 
 * Endpoints:
 * - GET /api/finance/ledger               - Get ledger entries (with filters)
 * - GET /api/finance/ledger/trial-balance - Get trial balance report
 * - GET /api/finance/ledger/balance-sheet - Get balance sheet report
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { runWithContext } from '@/server/lib/authContext';
import { requirePermission } from '@/server/lib/rbac.config';

import { dbConnect } from '@/lib/mongodb-unified';
import LedgerEntry from '@/server/models/finance/LedgerEntry';

import { Types } from 'mongoose';

import { logger } from '@/lib/logger';
// ============================================================================
// HELPER: Get User Session
// ============================================================================

async function getUserSession(_req: NextRequest) {
  const user = await getSessionUser(_req);
  
  if (!user) {
    return null;
  }
  
  return {
    userId: user.id,
    orgId: user.orgId,
    role: user.role
  };
}

// ============================================================================
// GET /api/finance/ledger - Get ledger entries with filters
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    // Auth check
    const user = await getUserSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Authorization check
    requirePermission(user.role, 'finance.ledger.read');
    
    // Execute with proper context
    return await runWithContext(
      { userId: user.userId, orgId: user.orgId, role: user.role, timestamp: new Date() },
      async () => {
        // Parse query parameters
        const { searchParams } = new URL(req.url);
        const accountId = searchParams.get('accountId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const propertyId = searchParams.get('propertyId');
        const unitId = searchParams.get('unitId');
        const workOrderId = searchParams.get('workOrderId');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 100);
        const skip = (page - 1) * limit;
        
        // Build query
        const query: Record<string, unknown> = { orgId: new Types.ObjectId(user.orgId) };
        
        if (accountId) {
          if (!Types.ObjectId.isValid(accountId)) {
            return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
          }
          query.accountId = new Types.ObjectId(accountId);
        }
        
        if (startDate || endDate) {
          query.date = {};
          if (startDate) (query.date as Record<string, Date>).$gte = new Date(startDate);
          if (endDate) (query.date as Record<string, Date>).$lte = new Date(endDate);
        }
        
        if (propertyId) {
          if (!Types.ObjectId.isValid(propertyId)) {
            return NextResponse.json({ error: 'Invalid property ID' }, { status: 400 });
          }
          query.propertyId = new Types.ObjectId(propertyId);
        }
        
        if (unitId) {
          if (!Types.ObjectId.isValid(unitId)) {
            return NextResponse.json({ error: 'Invalid unit ID' }, { status: 400 });
          }
          query.unitId = new Types.ObjectId(unitId);
        }
        
        if (workOrderId) {
          if (!Types.ObjectId.isValid(workOrderId)) {
            return NextResponse.json({ error: 'Invalid work order ID' }, { status: 400 });
          }
          query.workOrderId = new Types.ObjectId(workOrderId);
        }
        
        // Execute query with pagination
        const [entries, total] = await Promise.all([
          LedgerEntry.find(query)
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          LedgerEntry.countDocuments(query)
        ]);
        
        return NextResponse.json({
          success: true,
          data: entries,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        });
      }
    );
    
  } catch (error) {
    logger.error('GET /api/finance/ledger error:', error);
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
