/**
 * @description Handles payment reconciliation and status actions.
 * POST reconcile: Matches payment with bank statement entry.
 * POST clear: Marks cheque payment as cleared.
 * POST bounce: Marks cheque as bounced, reverses allocation.
 * @route POST /api/finance/payments/[id]/reconcile
 * @route POST /api/finance/payments/[id]/clear
 * @route POST /api/finance/payments/[id]/bounce
 * @access Private - Users with FINANCE:RECONCILE permission
 * @param {string} id - Payment ID (MongoDB ObjectId)
 * @param {string} action - Action type (reconcile, clear, bounce)
 * @param {Object} body - bankStatementDate (for reconcile), reason (for bounce)
 * @returns {Object} payment: updated payment with new status
 * @throws {401} If not authenticated
 * @throws {403} If lacking FINANCE:RECONCILE permission
 * @throws {404} If payment not found
 * @throws {409} If status transition not allowed
 */
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { Payment } from "@/server/models/finance/Payment";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { runWithContext } from "@/server/lib/authContext";
import { requirePermission } from "@/config/rbac.config";
import { parseBodyOrNull } from "@/lib/api/parse-body";
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
  const rateLimitResponse = enforceRateLimit(req, {
    requests: 30,
    windowMs: 60_000,
    keyPrefix: "finance:payments:action",
  });
  if (rateLimitResponse) return rateLimitResponse;

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
        // eslint-disable-next-line local/require-lean -- NO_LEAN: Document needed for reconcile/reverse actions
        const payment = await Payment.findOne({
          _id: _params.id,
          orgId: user.orgId,
        });

        if (!payment) {
          return notFoundError("Payment");
        }

        if (action === "reconcile") {
          const body = await parseBodyOrNull(req);
          if (!body) {
            return NextResponse.json(
              { error: "Invalid JSON body" },
              { status: 400 },
            );
          }
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

          const body = await parseBodyOrNull(req);
          if (!body) {
            return NextResponse.json(
              { error: "Invalid JSON body" },
              { status: 400 },
            );
          }
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

        // FIXED [AGENT-0008]: Implement cancel action
        if (action === "cancel") {
          // Check if payment can be cancelled
          if (["CANCELLED", "CLEARED", "RECONCILED", "REFUNDED"].includes(payment.status)) {
            return NextResponse.json(
              {
                success: false,
                error: `Cannot cancel payment with status: ${payment.status}`,
              },
              { status: 400 },
            );
          }

          const body = await parseBodyOrNull(req) as { reason?: string } | null;
          const reason = body?.reason || "Cancelled by user";

          payment.status = "CANCELLED";
          payment.updatedBy = new Types.ObjectId(user.userId);
          payment.notes = `${payment.notes || ""}\nCancelled: ${reason} (${new Date().toISOString().split("T")[0]})`;
          await payment.save();

          logger.info("Payment cancelled", {
            paymentId: _params.id,
            userId: user.userId,
            orgId: user.orgId,
            reason,
          });

          return NextResponse.json({
            success: true,
            data: payment,
            message: "Payment cancelled successfully",
          });
        }

        // FIXED [AGENT-0008]: Implement refund action
        if (action === "refund") {
          // Check if payment can be refunded
          if (!["COMPLETED", "CLEARED", "RECONCILED"].includes(payment.status)) {
            return NextResponse.json(
              {
                success: false,
                error: `Cannot refund payment with status: ${payment.status}. Payment must be completed first.`,
              },
              { status: 400 },
            );
          }

          const body = await parseBodyOrNull(req) as { reason?: string; amount?: number } | null;
          if (!body) {
            return NextResponse.json(
              { error: "Invalid JSON body - refund requires reason" },
              { status: 400 },
            );
          }

          const refundReason = body.reason || "Refund requested";
          const refundAmount = body.amount || payment.amount;

          // Validate refund amount
          if (typeof refundAmount !== "number" || refundAmount <= 0 || refundAmount > (payment.amount ?? 0)) {
            return NextResponse.json(
              {
                success: false,
                error: `Invalid refund amount. Must be between 0 and ${payment.amount}`,
              },
              { status: 400 },
            );
          }

          payment.status = "REFUNDED"; // Only full refunds for now; PARTIALLY_REFUNDED not in enum
          payment.updatedBy = new Types.ObjectId(user.userId);
          payment.notes = `${payment.notes || ""}\nRefunded: ${refundAmount} SAR - ${refundReason} (${new Date().toISOString().split("T")[0]})`;
          
          // Add refund metadata if the model supports it
          if ("refundDetails" in payment) {
            (payment as { refundDetails?: object }).refundDetails = {
              amount: refundAmount,
              reason: refundReason,
              refundedAt: new Date(),
              refundedBy: new Types.ObjectId(user.userId),
            };
          }
          
          await payment.save();

          logger.info("Payment refunded", {
            paymentId: _params.id,
            userId: user.userId,
            orgId: user.orgId,
            refundAmount,
            refundReason,
          });

          return NextResponse.json({
            success: true,
            data: payment,
            message: `Refund of ${refundAmount} SAR processed`,
          });
        }

        // Fallback for unknown actions
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
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
