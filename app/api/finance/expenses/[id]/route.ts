/**
 * Individual Expense API Routes
 * GET /api/finance/expenses/:id - Get single expense
 * PUT /api/finance/expenses/:id - Update expense
 * DELETE /api/finance/expenses/:id - Cancel expense
 */

import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';
import { Expense } from '@/server/models/finance/Expense';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { runWithContext } from '@/server/lib/authContext';
import { requirePermission } from '@/server/lib/rbac.config';


async function getUserSession(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !user.id || !user.orgId) {
    throw new TypeError('Unauthorized: Invalid session');
  }
  return {
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
  };
}

import type { RouteContext } from '@/lib/types/route-context';

import { logger } from '@/lib/logger';
/**
 * GET /api/finance/expenses/:id
 */
export async function GET(req: NextRequest, context: RouteContext<{ id: string }>) {
  try {
    const user = await getUserSession(req);

    // Authorization check
    requirePermission(user.role, 'finance.expenses.read');

    // Resolve params (Next.js 15 provides params as a Promise)
    const _params = await Promise.resolve(context.params);

    if (!Types.ObjectId.isValid(_params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid expense ID' },
        { status: 400 }
      );
    }

    // Execute with proper context
    return await runWithContext(
      { userId: user.userId, orgId: user.orgId, role: user.role, timestamp: new Date() },
      async () => {
        const expense = await Expense.findOne({
          _id: _params.id,
          orgId: user.orgId,
        });

        if (!expense) {
          return NextResponse.json(
            { success: false, error: 'Expense not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: expense,
        });
      }
    );
  } catch (error) {
    logger.error('Error fetching expense:', error);
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch expense',
      },
      { status: 500 }
    );
  }
}

const UpdateExpenseSchema = z.object({
  expenseDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(z.any()).optional(), // Simplified for update
  subtotal: z.number().optional(),
  totalTax: z.number().optional(),
  totalAmount: z.number().optional(),
});

/**
 * PUT /api/finance/expenses/:id
 * Update expense (only if DRAFT status)
 */
export async function PUT(req: NextRequest, context: RouteContext<{ id: string }>) {
  try {
    const user = await getUserSession(req);

    // Authorization check
    requirePermission(user.role, 'finance.expenses.update');

    // Resolve params (Next.js 15 provides params as a Promise)
    const _params = await Promise.resolve(context.params);

    if (!Types.ObjectId.isValid(_params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid expense ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data = UpdateExpenseSchema.parse(body);

    // Execute with proper context
    return await runWithContext(
      { userId: user.userId, orgId: user.orgId, role: user.role, timestamp: new Date() },
      async () => {
        const expense = await Expense.findOne({
          _id: _params.id,
          orgId: user.orgId,
        });

        if (!expense) {
          return NextResponse.json(
            { success: false, error: 'Expense not found' },
            { status: 404 }
          );
        }

        // Only allow updates for DRAFT expenses
        if (expense.status !== 'DRAFT') {
          return NextResponse.json(
            { success: false, error: 'Only draft expenses can be updated' },
            { status: 400 }
          );
        }

        // Update expense
        Object.assign(expense, data);
        expense.updatedBy = user.userId;
        await expense.save();

        return NextResponse.json({
          success: true,
          data: expense,
          message: 'Expense updated successfully',
        });
      }
    );
  } catch (error) {
    logger.error('Error updating expense:', error);

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
        error: error instanceof Error ? error.message : 'Failed to update expense',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/finance/expenses/:id
 * Cancel expense
 */
export async function DELETE(req: NextRequest, context: RouteContext<{ id: string }>) {
  try {
    const user = await getUserSession(req);

    // Authorization check
    requirePermission(user.role, 'finance.expenses.delete');

    // Resolve params (Next.js 15 provides params as a Promise)
    const _params = await Promise.resolve(context.params);

    if (!Types.ObjectId.isValid(_params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid expense ID' },
        { status: 400 }
      );
    }

    // Execute with proper context
    return await runWithContext(
      { userId: user.userId, orgId: user.orgId, role: user.role, timestamp: new Date() },
      async () => {
        const expense = await Expense.findOne({
          _id: _params.id,
          orgId: user.orgId,
        });

        if (!expense) {
          return NextResponse.json(
            { success: false, error: 'Expense not found' },
            { status: 404 }
          );
        }

        // Only allow cancellation for non-PAID expenses
        if (expense.status === 'PAID') {
          return NextResponse.json(
            { success: false, error: 'Paid expenses cannot be cancelled' },
            { status: 400 }
          );
        }

        expense.status = 'CANCELLED';
        expense.updatedBy = user.userId;
        await expense.save();

        return NextResponse.json({
          success: true,
          message: 'Expense cancelled successfully',
        });
      }
    );
  } catch (error) {
    logger.error('Error cancelling expense:', error);
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel expense',
      },
      { status: 500 }
    );
  }
}
