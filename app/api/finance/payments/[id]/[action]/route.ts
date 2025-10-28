/**
 * Payment reconciliation API
 * POST /api/finance/payments/:id/reconcile - Reconcile payment with bank statement
 * POST /api/finance/payments/:id/clear - Mark payment as cleared
 * POST /api/finance/payments/:id/bounce - Mark cheque as bounced
 */

import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';
import { Payment } from '@/server/models/finance/Payment';
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

const ReconcileSchema = z.object({
  bankStatementDate: z.coerce.date(),
  bankStatementReference: z.string(),
  clearedAmount: z.number().positive(),
  notes: z.string().optional(),
});

const BounceSchema = z.object({
  bounceReason: z.string().min(1),
  bounceDate: z.coerce.date(),
  bounceCharges: z.number().min(0).optional(),
});

/**
 * POST /api/finance/payments/:id/[action]
 * Handle payment reconciliation actions
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; action?: string } }
) {
  try {
    const user = await getUserSession(req);
    setTenantContext({ orgId: user.orgId });
    setAuditContext({ userId: user.userId });

    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment ID' },
        { status: 400 }
      );
    }

    const payment = await Payment.findOne({
      _id: params.id,
      orgId: user.orgId,
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Determine action from URL path
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    if (action === 'reconcile') {
      const body = await req.json();
      const data = ReconcileSchema.parse(body);

      await payment.reconcile(
        data.bankStatementDate,
        data.bankStatementReference,
        data.clearedAmount,
        user.userId,
        data.notes
      );

      return NextResponse.json({
        success: true,
        data: payment,
        message: 'Payment reconciled successfully',
      });
    }

    if (action === 'clear') {
      payment.status = 'CLEARED';
      payment.updatedBy = user.userId;
      await payment.save();

      return NextResponse.json({
        success: true,
        data: payment,
        message: 'Payment marked as cleared',
      });
    }

    if (action === 'bounce') {
      if (payment.paymentMethod !== 'CHEQUE') {
        return NextResponse.json(
          { success: false, error: 'Only cheque payments can be marked as bounced' },
          { status: 400 }
        );
      }

      const body = await req.json();
      const data = BounceSchema.parse(body);

      payment.status = 'BOUNCED';
      payment.updatedBy = user.userId;
      payment.notes = `${payment.notes || ''}\nBounced: ${data.bounceReason} (${data.bounceDate.toISOString().split('T')[0]})`;
      await payment.save();

      return NextResponse.json({
        success: true,
        data: payment,
        message: 'Payment marked as bounced',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing payment action:', error);

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
        error: error instanceof Error ? error.message : 'Failed to process payment action',
      },
      { status: 500 }
    );
  }
}
