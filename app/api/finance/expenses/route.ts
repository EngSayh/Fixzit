/**
 * Expense API Routes
 * POST /api/finance/expenses - Create expense (draft or direct submission)
 * GET /api/finance/expenses - List expenses with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Expense } from '@/server/models/finance/Expense';
import ChartAccount from '@/server/models/finance/ChartAccount';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { runWithContext } from '@/server/lib/authContext';
import { requirePermission } from '@/server/lib/rbac.config';
import { Types } from 'mongoose';

import { logger } from '@/lib/logger';
// Validation schemas
const ExpenseLineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  amount: z.number().min(0),
  taxable: z.boolean().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  taxAmount: z.number().min(0).optional(),
  totalAmount: z.number().min(0),
  accountId: z.string().optional(),
});

const ReceiptSchema = z.object({
  url: z.string().url(),
  fileName: z.string(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  uploadedAt: z.date().optional(),
  uploadedBy: z.string().optional(),
});

const CreateExpenseSchema = z.object({
  expenseNumber: z.string().optional(), // Auto-generated if not provided
  expenseDate: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  expenseType: z.enum(['OPERATIONAL', 'MAINTENANCE', 'CAPITAL', 'REIMBURSEMENT', 'UTILITY', 'ADMINISTRATIVE', 'OTHER']),
  category: z.enum([
    'MAINTENANCE_REPAIR',
    'UTILITIES',
    'INSURANCE',
    'PROPERTY_TAX',
    'PROFESSIONAL_FEES',
    'MANAGEMENT_FEES',
    'MARKETING',
    'SUPPLIES',
    'TRAVEL',
    'EQUIPMENT',
    'LABOR',
    'PERMITS',
    'CLEANING',
    'LANDSCAPING',
    'OTHER',
  ]),
  description: z.string().min(1),
  vendorId: z.string().optional(),
  vendorName: z.string().optional(),
  propertyId: z.string().optional(),
  unitId: z.string().optional(),
  workOrderId: z.string().optional(),
  referenceNumber: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'OTHER']).optional(),
  lineItems: z.array(ExpenseLineItemSchema).min(1),
  subtotal: z.number().min(0),
  totalTax: z.number().min(0).optional(),
  totalAmount: z.number().min(0).optional(), // Calculated server-side
  currency: z.string().default('SAR'),
  notes: z.string().optional(),
  receipts: z.array(ReceiptSchema).optional(),
  // Status removed - always DRAFT on create
  budgetId: z.string().optional(),
  budgetCategoryId: z.string().optional(),
});

async function getUserSession(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !user.id || !user.orgId) {
    throw new Error('Unauthorized: Invalid session');
  }
  return {
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
  };
}

/**
 * POST /api/finance/expenses
 * Create a new expense (draft or submitted)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserSession(req);

    // Authorization check
    requirePermission(user.role, 'finance.expenses.create');

    // Parse request body
    const body = await req.json();
    const data = CreateExpenseSchema.parse(body);

    // Execute with proper context
    return await runWithContext(
      { userId: user.userId, orgId: user.orgId, role: user.role, timestamp: new Date() },
      async () => {
        // Validate all accountId references belong to this org
        const accountIds = data.lineItems
          .map(item => item.accountId)
          .filter((id): id is string => !!id);
        
        if (accountIds.length > 0) {
          const validAccounts = await ChartAccount.find({
            _id: { $in: accountIds.map(id => new Types.ObjectId(id)) },
            orgId: new Types.ObjectId(user.orgId)
          }).select('_id');
          
          const validIds = new Set(validAccounts.map(a => a._id.toString()));
          const invalidIds = accountIds.filter(id => !validIds.has(id));
          
          if (invalidIds.length > 0) {
            return NextResponse.json(
              { success: false, error: `Invalid account IDs: ${invalidIds.join(', ')}` },
              { status: 400 }
            );
          }
        }
        
        // Calculate total amount server-side (prevent client tampering)
        const calculatedSubtotal = data.lineItems.reduce(
          (sum, item) => sum + item.totalAmount,
          0
        );
        
        const calculatedTotal = calculatedSubtotal;
        
        // Reject if client provided amount differs significantly (allow 0.01 rounding)
        if (data.totalAmount !== undefined && Math.abs(data.totalAmount - calculatedTotal) > 0.01) {
          return NextResponse.json(
            {
              success: false,
              error: 'Amount mismatch',
              details: {
                clientTotal: data.totalAmount,
                serverTotal: calculatedTotal,
                difference: Math.abs(data.totalAmount - calculatedTotal)
              }
            },
            { status: 400 }
          );
        }
        
        // Create expense - always DRAFT
        const expense = await Expense.create({
          ...data,
          totalAmount: calculatedTotal,
          orgId: user.orgId,
          createdBy: user.userId,
          status: 'DRAFT', // Force DRAFT - require submit endpoint for SUBMITTED
        });

        return NextResponse.json({
          success: true,
          data: expense,
          message: 'Expense draft created',
        });
      }
    );
  } catch (error) {
    logger.error('Error creating expense:', error);

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          issues: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create expense',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/finance/expenses
 * List expenses with filters
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserSession(req);

    // Authorization check
    requirePermission(user.role, 'finance.expenses.read');

    const { searchParams } = new URL(req.url);

    // Execute with proper context
    return await runWithContext(
      { userId: user.userId, orgId: user.orgId, role: user.role, timestamp: new Date() },
      async () => {
        // Build query
        const query: Record<string, unknown> = {
          orgId: user.orgId,
        };

        // Filters
        const status = searchParams.get('status');
        if (status) query.status = status;

        const expenseType = searchParams.get('expenseType');
        if (expenseType) query.expenseType = expenseType;

        const category = searchParams.get('category');
        if (category) query.category = category;

        const vendorId = searchParams.get('vendorId');
        if (vendorId) query.vendorId = vendorId;

        const propertyId = searchParams.get('propertyId');
        if (propertyId) query.propertyId = propertyId;

        const unitId = searchParams.get('unitId');
        if (unitId) query.unitId = unitId;

        const workOrderId = searchParams.get('workOrderId');
        if (workOrderId) query.workOrderId = workOrderId;

        // Date range
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        if (startDate || endDate) {
          query.expenseDate = {};
          if (startDate) {
            (query.expenseDate as { $gte?: Date }).$gte = new Date(startDate);
          }
          if (endDate) {
            (query.expenseDate as { $lte?: Date }).$lte = new Date(endDate);
          }
        }

        // Pagination
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const skip = (page - 1) * limit;

        // Execute query
        const [expenses, totalCount] = await Promise.all([
          Expense.find(query)
            .sort({ expenseDate: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          Expense.countDocuments(query),
        ]);

        return NextResponse.json({
          success: true,
          data: expenses,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        });
      }
    );
  } catch (error) {
    logger.error('Error fetching expenses:', error);
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch expenses',
      },
      { status: 500 }
    );
  }
}
