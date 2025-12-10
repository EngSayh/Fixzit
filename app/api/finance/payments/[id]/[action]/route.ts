/**
 * Payment reconciliation API
 * POST /api/finance/payments/:id/reconcile - Reconcile payment with bank statement
 * POST /api/finance/payments/:id/clear - Mark payment as cleared
 * POST /api/finance/payments/:id/bounce - Mark cheque as bounced
 */

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { Payment } from "@/server/models/finance/Payment";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { runWithContext } from "@/server/lib/authContext";
import { requirePermission } from "@/config/rbac.config";
import { forbiddenError, handleApiError, isForbidden, unauthorizedError, validationError, notFoundError } from "@/server/utils/errorResponses";

async function getUserSession(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !user.id || !user.orgId) {
    return null;
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

import type { RouteContext } from "@/lib/types/route-context";

import { logger } from "@/lib/logger";
/**
 * POST /api/finance/payments/:id/[action]
 * Handle payment reconciliation actions
 */
export async function POST(
  req: NextRequest,
  context: RouteContext<{ id: string; action: string }>,
) {
  try {
    const user = await getUserSession(req);
    if (!user) {
      return unauthorizedError();
    }

    // Resolve params (Next.js 15 provides params as a Promise)
    const _params = await Promise.resolve(context.params);

    if (!Types.ObjectId.isValid(_params.id)) {
      return validationError("Invalid payment ID");
    }

    // Determine action from URL path
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    // Authorization check based on action
    if (action === "reconcile") {
      requirePermission(user.role, "finance.payments.reconcile");
    } else if (action === "clear") {
      requirePermission(user.role, "finance.payments.clear");
    } else if (action === "bounce") {
      requirePermission(user.role, "finance.payments.bounce");
    } else if (action === "cancel") {
      requirePermission(user.role, "finance.payments.cancel");
    } else if (action === "refund") {
      requirePermission(user.role, "finance.payments.refund");
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 },
      );
    }

    // Execute with proper context
    return await runWithContext(
      {
        userId: user.userId,
        orgId: user.orgId,
        role: user.role,
        timestamp: new Date(),
      },
      async () => {
        const payment = await Payment.findOne({
          _id: _params.id,
          orgId: user.orgId,
        });

        if (!payment) {
          return notFoundError("Payment");
        }

        if (action === "reconcile") {
          const body = await req.json();
          const data = ReconcileSchema.parse(body);

          await payment.reconcile(
            new Types.ObjectId(user.userId),
            data.bankStatementDate,
            data.bankStatementReference,
            data.notes,
          );

          return NextResponse.json({
            success: true,
            data: payment,
            message: "Payment reconciled successfully",
          });
        }

        if (action === "clear") {
          payment.status = "CLEARED";
          payment.updatedBy = new Types.ObjectId(user.userId);
          await payment.save();

          return NextResponse.json({
            success: true,
            data: payment,
            message: "Payment marked as cleared",
          });
        }

        if (action === "bounce") {
          if (payment.paymentMethod !== "CHEQUE") {
            return NextResponse.json(
              {
                success: false,
                error: "Only cheque payments can be marked as bounced",
              },
              { status: 400 },
            );
          }

          const body = await req.json();
          const data = BounceSchema.parse(body);

          payment.status = "BOUNCED";
          payment.updatedBy = new Types.ObjectId(user.userId);
          payment.notes = `${payment.notes || ""}\nBounced: ${data.bounceReason} (${data.bounceDate.toISOString().split("T")[0]})`;
          await payment.save();

          return NextResponse.json({
            success: true,
            data: payment,
            message: "Payment marked as bounced",
          });
        }

        // Placeholder for cancel/refund actions (if needed later)
        return NextResponse.json(
          { success: false, error: "Action not implemented" },
          { status: 400 },
        );
      },
    );
  } catch (error) {
    logger.error("Error processing payment action:", error);

    if (isForbidden(error)) {
      return forbiddenError("Access denied to payments");
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    return handleApiError(error);
  }
}
