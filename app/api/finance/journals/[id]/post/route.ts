/**
 * Journal Post/Void API Routes - Finance Pack Phase 2
 * 
 * Endpoints:
 * - POST /api/finance/journals/[id]/post - Post journal to ledger
 * - POST /api/finance/journals/[id]/void - Void posted journal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';

import { dbConnect } from '@/lib/mongodb-unified';
import Journal from '@/server/models/finance/Journal';
import postingService from '@/server/services/finance/postingService';
import { setTenantContext } from '@/server/plugins/tenantIsolation';
import { setAuditContext } from '@/server/plugins/auditPlugin';
import { Types } from 'mongoose';

// ============================================================================
// HELPER: Get User Session
// ============================================================================

async function getUserSession(req: NextRequest) {
  const user = await getSessionUser(req);
  
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
// POST /api/finance/journals/[id]/post - Post journal to ledger
// ============================================================================

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    // Auth check
    const user = await getUserSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate journal ID
    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid journal ID' }, { status: 400 });
    }
    
    // Set context for plugins
    setTenantContext({ orgId: user.orgId });
    setAuditContext({ 
      userId: user.userId,
      userEmail: user.userId,
      timestamp: new Date()
    });
    
    // Check journal exists and belongs to org
    const journal = await Journal.findOne({
      _id: new Types.ObjectId(params.id),
      orgId: new Types.ObjectId(user.orgId)
    });
    
    if (!journal) {
      return NextResponse.json({ error: 'Journal not found' }, { status: 404 });
    }
    
    // Check journal status
    if (journal.status !== 'DRAFT') {
      return NextResponse.json({
        error: `Cannot post journal with status ${journal.status}`
      }, { status: 400 });
    }
    
    // Post journal to ledger using postingService
    const result = await postingService.postJournal(new Types.ObjectId(params.id));
    
    return NextResponse.json({
      success: true,
      data: {
        journal: result.journal,
        ledgerEntries: result.ledgerEntries,
        message: `Journal ${result.journal.journalNumber} posted successfully. ${result.ledgerEntries.length} ledger entries created.`
      }
    });
    
  } catch (error) {
    console.error('POST /api/finance/journals/[id]/post error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to post journal'
    }, { status: 400 });
  }
}
