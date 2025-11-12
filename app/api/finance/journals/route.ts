/**
 * Journal API Routes - Finance Pack Phase 2
 * 
 * Endpoints:
 * - POST   /api/finance/journals          - Create draft journal
 * - GET    /api/finance/journals          - List journals (with filters)
 * - GET    /api/finance/journals/:id      - Get journal by ID
 * - POST   /api/finance/journals/:id/post - Post journal to ledger
 * - POST   /api/finance/journals/:id/void - Void posted journal
 * - DELETE /api/finance/journals/:id      - Delete draft journal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { runWithContext } from '@/server/lib/authContext';
import { requirePermission } from '@/server/lib/rbac.config';
import { dbConnect } from '@/lib/mongodb-unified';
import Journal from '@/server/models/finance/Journal';
import postingService from '@/server/services/finance/postingService';


import { Types } from 'mongoose';
import { z } from 'zod';

import { logger } from '@/lib/logger';
// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const JournalLineSchema = z.object({
  accountId: z.string().refine(val => Types.ObjectId.isValid(val), 'Invalid account ID'),
  accountCode: z.string().optional(),
  accountName: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  debit: z.number().min(0).optional(),
  credit: z.number().min(0).optional(),
  // Dimensions (optional context)
  propertyId: z.string().refine(val => !val || Types.ObjectId.isValid(val), 'Invalid property ID').optional(),
  unitId: z.string().refine(val => !val || Types.ObjectId.isValid(val), 'Invalid unit ID').optional(),
  workOrderId: z.string().refine(val => !val || Types.ObjectId.isValid(val), 'Invalid work order ID').optional(),
  leaseId: z.string().refine(val => !val || Types.ObjectId.isValid(val), 'Invalid lease ID').optional(),
  vendorId: z.string().refine(val => !val || Types.ObjectId.isValid(val), 'Invalid vendor ID').optional()
});

const CreateJournalSchema = z.object({
  date: z.string().or(z.date()),
  description: z.string().min(1, 'Description is required'),
  reference: z.string().optional(),
  sourceType: z.enum(['MANUAL', 'INVOICE', 'PAYMENT', 'EXPENSE', 'WORK_ORDER', 'ADJUSTMENT']).optional(),
  sourceId: z.string().refine(val => !val || Types.ObjectId.isValid(val), 'Invalid source ID').optional(),
  lines: z.array(JournalLineSchema).min(2, 'Journal must have at least 2 lines')
});

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
// POST /api/finance/journals - Create draft journal
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    // Auth check
    const user = await getUserSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Authorization check
    requirePermission(user.role, 'finance.journals.create');
    
    // Parse and validate request body
    const body = await req.json();
    const validated = CreateJournalSchema.parse(body);
    
    // Execute with proper context
    return await runWithContext(
      { userId: user.userId, orgId: user.orgId, role: user.role, timestamp: new Date() },
      async () => {
        // Create draft journal using postingService
        const journal = await postingService.createJournal({
          orgId: new Types.ObjectId(user.orgId),
          journalDate: new Date(validated.date),
          description: validated.description,
          sourceType: validated.sourceType || 'MANUAL',
          sourceId: validated.sourceId ? new Types.ObjectId(validated.sourceId) : undefined,
          sourceNumber: validated.reference,
          lines: validated.lines.map(line => ({
            accountId: new Types.ObjectId(line.accountId),
            accountCode: line.accountCode,
            accountName: line.accountName,
            description: line.description,
            debit: line.debit || 0,
            credit: line.credit || 0,
            propertyId: line.propertyId ? new Types.ObjectId(line.propertyId) : undefined,
            unitId: line.unitId ? new Types.ObjectId(line.unitId) : undefined,
            workOrderId: line.workOrderId ? new Types.ObjectId(line.workOrderId) : undefined,
            leaseId: line.leaseId ? new Types.ObjectId(line.leaseId) : undefined,
            vendorId: line.vendorId ? new Types.ObjectId(line.vendorId) : undefined
          })),
          userId: new Types.ObjectId(user.userId)
        });
        
        return NextResponse.json({
          success: true,
          data: journal
        }, { status: 201 });
      }
    );
    
  } catch (error) {
    logger.error('POST /api/finance/journals error:', error);
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.issues
      }, { status: 400 });
    }
    
    if (error instanceof Error) {
      return NextResponse.json({
        error: error.message
      }, { status: 400 });
    }
    
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// ============================================================================
// GET /api/finance/journals - List journals with filters
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
    requirePermission(user.role, 'finance.journals.read');
    
    // Execute with proper context
    return await runWithContext(
      { userId: user.userId, orgId: user.orgId, role: user.role, timestamp: new Date() },
      async () => {
        // Parse query parameters
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status'); // DRAFT, POSTED, VOID
        const sourceType = searchParams.get('sourceType');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const skip = (page - 1) * limit;
        
        // Build query
        const query: Record<string, unknown> = { orgId: new Types.ObjectId(user.orgId) };
        
        if (status) {
          query.status = status;
        }
        
        if (sourceType) {
          query.sourceType = sourceType;
        }
        
        if (startDate || endDate) {
          query.date = {};
          if (startDate) (query.date as Record<string, Date>).$gte = new Date(startDate);
          if (endDate) (query.date as Record<string, Date>).$lte = new Date(endDate);
        }
        
        // Execute query with pagination
        const [journals, total] = await Promise.all([
          Journal.find(query)
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          Journal.countDocuments(query)
        ]);
        
        return NextResponse.json({
          success: true,
          data: journals,
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
    logger.error('GET /api/finance/journals error:', error);
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
