/**
 * Payment Complete API Route
 * POST /api/finance/payments/:id/complete - Mark payment as completed
 */

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { Payment, PaymentStatus } from "@/server/models/finance/Payment";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { runWithContext } from "@/server/lib/authContext";
import { requirePermission } from "@/config/rbac.config";
import { logger } from "@/lib/logger";
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

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = enforceRateLimit(req, {
    requests: 30,
    windowMs: 60_000,
    keyPrefix: "finance:payments:complete",
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = params;
    const user = await getUserSession(req);
    if (!user) {
      return unauthorizedError();
    }

    if (!Types.ObjectId.isValid(id)) {
      return validationError("Invalid payment ID");
    }

    // Authorization check
    requirePermission(user.role, "finance.payments.update");

    // Execute with proper context
    return await runWithContext(
      {
        userId: user.userId,
        orgId: user.orgId,
        role: user.role,
        timestamp: new Date(),
      },
      async () => {
        // NO_LEAN: Document needed for payment completion update
        const payment = await Payment.findOne({
          _id: id,
          orgId: user.orgId,
        });

        if (!payment) {
          return notFoundError("Payment");
        }

        if (payment.status === PaymentStatus.CLEARED) {
          return validationError("Payment is already completed");
        }

        if (payment.status !== PaymentStatus.POSTED) {
          return validationError(
            "Payment must be in POSTED status before it can be marked as completed",
          );
        }

        // Update payment status to completed/cleared
        payment.status = PaymentStatus.CLEARED;
        payment.reconciliation = {
          ...payment.reconciliation,
          isReconciled: true,
          reconciledAt: new Date(),
          reconciledBy: new Types.ObjectId(user.userId),
        };
        await payment.save();

        const responsePayload = {
          id: payment._id.toString(),
          paymentNumber: payment.paymentNumber,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          paymentDate: payment.paymentDate,
          reconciledAt: payment.reconciliation?.reconciledAt,
          reconciledBy: payment.reconciliation?.reconciledBy
            ? payment.reconciliation.reconciledBy.toString()
            : undefined,
        };

        return NextResponse.json(
          {
            success: true,
            data: responsePayload,
            message: "Payment marked as completed",
          }
        );
      }
    );
  } catch (error) {
    logger.error("Error completing payment:", error);

    if (isForbidden(error)) {
      return forbiddenError("Access denied to payments");
    }

    return handleApiError(error);
  }
}
