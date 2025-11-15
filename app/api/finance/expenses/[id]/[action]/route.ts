/**
 * Expense Approval API Routes
 * POST /api/finance/expenses/:id/submit - Submit for approval
 * POST /api/finance/expenses/:id/approve - Approve expense
 * POST /api/finance/expenses/:id/reject - Reject expense
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
    throw new Error('Unauthorized: Invalid session');
  }
  return {
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
  };
}

const ApprovalSchema = z.object({
  comments: z.string().optional(),
});

import type { RouteContext } from '@/lib/types/route-context';

import { logger } from '@/lib/logger';
/**
 * POST /api/finance/expenses/:id/submit|approve|reject
 */
export async function POST(
  req: NextRequest,
  context: RouteContext<{ id: string; action: string }>
) {
  try {
    const user = await getUserSession(req);

    // Resolve params (Next.js 15 provides params as a Promise)
    const _params = await Promise.resolve(context.params);

    if (!Types.ObjectId.isValid(_params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid expense ID' },
        { status: 400 }
      );
    }

    // Use typed action parameter from route context
    const action = _params.action;

    // Authorization check based on action
    if (action === 'submit') {
      requirePermission(user.role, 'finance.expenses.submit');
    } else if (action === 'approve') {
      requirePermission(user.role, 'finance.expenses.approve');
    } else if (action === 'reject') {
      requirePermission(user.role, 'finance.expenses.reject');
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
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

        if (action === 'submit') {
          if (expense.status !== 'DRAFT') {
            return NextResponse.json(
              { success: false, error: 'Only draft expenses can be submitted' },
              { status: 400 }
            );
          }

          await expense.submit();
          await expense.save();

          return NextResponse.json({
            success: true,
            data: expense,
            message: 'Expense submitted for approval',
          });
        }

        if (action === 'approve') {
          if (expense.status !== 'SUBMITTED') {
            return NextResponse.json(
              { success: false, error: 'Only submitted expenses can be approved' },
              { status: 400 }
            );
          }

          const body = await req.json();
          const { comments } = ApprovalSchema.parse(body);

          await expense.approve(new Types.ObjectId(user.userId), comments);
          await expense.save();

          return NextResponse.json({
            success: true,
            data: expense,
            message: 'Expense approved',
          });
        }

        if (action === 'reject') {
          if (expense.status !== 'SUBMITTED') {
            return NextResponse.json(
              { success: false, error: 'Only submitted expenses can be rejected' },
              { status: 400 }
            );
          }

          const body = await req.json();
          const { comments } = ApprovalSchema.parse(body);

          if (!comments) {
            return NextResponse.json(
              { success: false, error: 'Rejection reason is required' },
              { status: 400 }
            );
          }

          await expense.reject(new Types.ObjectId(user.userId), comments);
          await expense.save();

          return NextResponse.json({
            success: true,
            data: expense,
            message: 'Expense rejected',
          });
        }

        // Should never reach here due to earlier check
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
      }
    );
  } catch (error) {
    logger.error('Error processing expense action:', error);

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
        error: error instanceof Error ? error.message : 'Failed to process expense action',
      },
      { status: 500 }
    );
  }
}
