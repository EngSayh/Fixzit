/**
 * Chart of Accounts API Routes - Finance Pack Phase 2
 * 
 * Endpoints:
 * - GET  /api/finance/accounts     - List accounts (with hierarchy)
 * - POST /api/finance/accounts     - Create new account
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { authOptions } from '@/auth';
import { dbConnect } from '@/lib/mongodb-unified';
import ChartAccount from '@/server/models/finance/ChartAccount';
import { setTenantContext } from '@/server/plugins/tenantIsolation';
import { setAuditContext } from '@/server/plugins/auditPlugin';
import { Types } from 'mongoose';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateAccountSchema = z.object({
  accountCode: z.string().min(1, 'Account code is required').max(20),
  accountName: z.string().min(1, 'Account name is required').max(200),
  accountType: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  normalBalance: z.enum(['DEBIT', 'CREDIT']),
  parentId: z.string().refine(val => !val || Types.ObjectId.isValid(val), 'Invalid parent ID').optional(),
  description: z.string().optional(),
  taxable: z.boolean().optional(),
  taxRate: z.number().min(0).max(1).optional(),
  isActive: z.boolean().optional()
});

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
// GET /api/finance/accounts - List accounts with hierarchy
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
    const accountType = searchParams.get('accountType');
    const parentId = searchParams.get('parentId');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const flat = searchParams.get('flat') === 'true'; // If true, return flat list instead of hierarchy
    
    // Build query
    const query: Record<string, unknown> = { orgId: new Types.ObjectId(user.orgId) };
    
    if (accountType) {
      query.accountType = accountType;
    }
    
    if (parentId) {
      if (parentId === 'null') {
        query.parentId = null;
      } else if (Types.ObjectId.isValid(parentId)) {
        query.parentId = new Types.ObjectId(parentId);
      }
    }
    
    if (!includeInactive) {
      query.isActive = true;
    }
    
    // Get accounts
    if (flat) {
      // Return flat list
      const accounts = await ChartAccount.find(query)
        .sort({ accountCode: 1 })
        .lean();
      
      return NextResponse.json({
        success: true,
        data: accounts
      });
    } else {
      // Return hierarchical structure
      const hierarchy = await ChartAccount.getHierarchy(new Types.ObjectId(user.orgId));
      
      // Filter by account type if specified
      let filteredHierarchy = hierarchy;
      if (accountType) {
        filteredHierarchy = hierarchy.filter(node => node.accountType === accountType);
      }
      
      return NextResponse.json({
        success: true,
        data: filteredHierarchy
      });
    }
    
  } catch (error) {
    console.error('GET /api/finance/accounts error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// ============================================================================
// POST /api/finance/accounts - Create new account
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    // Auth check
    const user = await getUserSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await req.json();
    const validated = CreateAccountSchema.parse(body);
    
    // Set context for plugins
    setTenantContext({ orgId: user.orgId });
    setAuditContext({ 
      userId: user.userId,
      userEmail: user.email,
      timestamp: new Date()
    });
    
    // Check if account code already exists
    const existingAccount = await ChartAccount.findOne({
      orgId: new Types.ObjectId(user.orgId),
      accountCode: validated.accountCode
    });
    
    if (existingAccount) {
      return NextResponse.json({
        error: `Account code ${validated.accountCode} already exists`
      }, { status: 400 });
    }
    
    // Validate parent account if provided
    if (validated.parentId) {
      const parent = await ChartAccount.findOne({
        _id: new Types.ObjectId(validated.parentId),
        orgId: new Types.ObjectId(user.orgId)
      });
      
      if (!parent) {
        return NextResponse.json({
          error: 'Parent account not found'
        }, { status: 400 });
      }
      
      // Validate account type matches parent
      if (parent.accountType !== validated.accountType) {
        return NextResponse.json({
          error: `Child account type (${validated.accountType}) must match parent account type (${parent.accountType})`
        }, { status: 400 });
      }
    }
    
    // Create new account
    const account = await ChartAccount.create({
      orgId: new Types.ObjectId(user.orgId),
      accountCode: validated.accountCode,
      accountName: validated.accountName,
      accountType: validated.accountType,
      normalBalance: validated.normalBalance,
      parentId: validated.parentId ? new Types.ObjectId(validated.parentId) : undefined,
      description: validated.description,
      taxable: validated.taxable ?? false,
      taxRate: validated.taxRate,
      isActive: validated.isActive ?? true,
      currentBalance: 0,
      year: new Date().getFullYear(),
      period: new Date().getMonth() + 1
    });
    
    return NextResponse.json({
      success: true,
      data: account
    }, { status: 201 });
    
  } catch (error) {
    console.error('POST /api/finance/accounts error:', error);
    
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
