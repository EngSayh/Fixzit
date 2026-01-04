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
import mongoose, { Types } from "mongoose";
import { z } from "zod";
import { Payment } from "@/server/models/finance/Payment";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { runWithContext } from "@/server/lib/authContext";
import { requirePermission } from "@/config/rbac.config";
import { parseBodyOrNull } from "@/lib/api/parse-body";
import { forbiddenError, handleApiError, isForbidden, unauthorizedError, validationError, notFoundError } from "@/server/utils/errorResponses";
import { nextNumber } from "@/server/lib/numbering";

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

// Zod schema for refund request body
const RefundSchema = z.object({
  amount: z.preprocess(
    (val) => (typeof val === "string" ? parseFloat(val) : val),
    z.number().nonnegative().optional()
  ),
  reason: z.string().optional(),
});

/**
 * Format amount with currency for display
 */
function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-SA", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if currency is invalid
    return `${amount.toFixed(2)} ${currency}`;
  }
}

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

        // Cancel action - requires proper workflow implementation
        if (action === "cancel") {
          // Check if payment is in a cancellable state
          if (!["PENDING", "SUBMITTED"].includes(payment.status)) {
            return NextResponse.json(
              { 
                success: false, 
                error: "Payment cannot be cancelled in current status",
                details: { currentStatus: payment.status, cancellableStatuses: ["PENDING", "SUBMITTED"] }
              },
              { status: 400 },
            );
          }
          
          payment.status = "CANCELLED";
          payment.updatedBy = new Types.ObjectId(user.userId);
          payment.notes = `${payment.notes || ""}\nCancelled by ${user.userId} at ${new Date().toISOString()}`;
          await payment.save();

          return NextResponse.json({
            success: true,
            data: payment,
            message: "Payment cancelled successfully",
          });
        }

        // Refund action - creates a refund payment record
        if (action === "refund") {
          // Validate refund request body with Zod
          const body = await parseBodyOrNull(req);
          const parsed = RefundSchema.safeParse(body || {});
          if (!parsed.success) {
            return NextResponse.json(
              { 
                success: false, 
                error: "Validation failed",
                issues: parsed.error.issues,
              },
              { status: 400 },
            );
          }
          const refundAmount = parsed.data.amount ?? payment.amount;
          const refundReason = parsed.data.reason ?? "Customer refund request";
          const refundCurrency = payment.currency || "SAR";
          
          // Validate payment is in refundable state
          const refundableStatuses = ["CLEARED", "POSTED"];
          if (!refundableStatuses.includes(payment.status)) {
            return NextResponse.json(
              { 
                success: false, 
                error: "Payment cannot be refunded in current status",
                details: { 
                  currentStatus: payment.status, 
                  refundableStatuses,
                }
              },
              { status: 400 },
            );
          }

          // Check if already refunded
          if (payment.isRefund) {
            return NextResponse.json(
              { 
                success: false, 
                error: "Cannot refund a refund payment",
              },
              { status: 400 },
            );
          }

          // Validate refund amount
          if (refundAmount <= 0 || refundAmount > payment.amount) {
            return NextResponse.json(
              { 
                success: false, 
                error: "Invalid refund amount",
                details: { 
                  requested: refundAmount,
                  maxRefundable: payment.amount,
                }
              },
              { status: 400 },
            );
          }

          // Use MongoDB transaction for atomic refund processing
          const session = await mongoose.startSession();
          session.startTransaction();
          
          try {
            // Re-check existing refunds within transaction to prevent race conditions
            const existingRefunds = await Payment.find({
              orgId: user.orgId,
              originalPaymentId: payment._id,
              isRefund: true,
            }).session(session).lean();

            const totalRefunded = existingRefunds.reduce((sum, r) => sum + (r.amount || 0), 0);
            const remainingRefundable = payment.amount - totalRefunded;

            if (refundAmount > remainingRefundable) {
              await session.abortTransaction();
              return NextResponse.json(
                { 
                  success: false, 
                  error: "Refund amount exceeds remaining refundable amount",
                  details: { 
                    requested: refundAmount,
                    totalRefunded,
                    remainingRefundable,
                  }
                },
                { status: 400 },
              );
            }

            // Generate refund payment number using atomic counter
            const now = new Date();
            const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
            const refundNumber = await nextNumber(user.orgId, `REF-${yearMonth}`);

            // Create refund payment record within transaction
            const refundPayment = new Payment({
              orgId: user.orgId,
              paymentNumber: refundNumber,
              paymentType: "MADE", // Refund is money going out
              amount: refundAmount,
              currency: refundCurrency,
              paymentMethod: payment.paymentMethod,
              paymentDate: now,
              status: "POSTED",
              partyType: payment.partyType,
              partyId: payment.partyId,
              partyName: payment.partyName,
              isRefund: true,
              originalPaymentId: payment._id,
              refundReason,
              notes: `Refund for payment ${payment.paymentNumber}: ${refundReason}`,
              referenceNumber: payment.paymentNumber,
              propertyId: payment.propertyId,
              unitId: payment.unitId,
              workOrderId: payment.workOrderId,
              createdBy: new Types.ObjectId(user.userId),
              allocations: [],
              unallocatedAmount: refundAmount,
              reconciliation: { isReconciled: false },
            });

            await refundPayment.save({ session });

            // Update original payment status if fully refunded
            const isFullyRefunded = totalRefunded + refundAmount >= payment.amount;
            if (isFullyRefunded) {
              payment.status = "REFUNDED";
              payment.updatedBy = new Types.ObjectId(user.userId);
              payment.notes = `${payment.notes || ""}\nFully refunded via ${refundNumber}`;
              await payment.save({ session });
            }

            // Commit transaction
            await session.commitTransaction();

            logger.info("Payment refund created", {
              originalPaymentId: _params.id,
              refundPaymentId: refundPayment._id.toString(),
              refundNumber,
              refundAmount,
              totalRefunded: totalRefunded + refundAmount,
              isFullyRefunded,
              processedBy: user.userId,
            });

            return NextResponse.json({
              success: true,
              data: {
                originalPayment: payment,
                refundPayment,
                summary: {
                  refundNumber,
                  refundAmount,
                  totalRefunded: totalRefunded + refundAmount,
                  remainingRefundable: payment.amount - totalRefunded - refundAmount,
                  isFullyRefunded,
                },
              },
              message: isFullyRefunded 
                ? "Payment fully refunded" 
                : `Partial refund of ${formatCurrency(refundAmount, refundCurrency)} processed`,
            });
          } catch (txError) {
            await session.abortTransaction();
            throw txError;
          } finally {
            session.endSession();
          }
        }

        // Unknown action (should not reach here due to authorization checks)
        return NextResponse.json(
          { success: false, error: "Unknown action" },
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
