/**
 * Payment Complete API Route
 * POST /api/finance/payments/:id/complete - Mark payment as completed
 */

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { Payment, PaymentStatus } from "@/server/models/finance/Payment";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { runWithContext } from "@/server/lib/authContext";
import { requirePermission } from "@/server/lib/rbac.config";
import { logger } from "@/lib/logger";

async function getUserSession(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !user.id || !user.orgId) {
    throw new Error("Unauthorized: Invalid session");
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
  try {
    const { id } = params;
    const user = await getUserSession(req);

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid payment ID" },
        { status: 400 }
      );
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
        const payment = await Payment.findOne({
          _id: id,
          orgId: user.orgId,
        });

        if (!payment) {
          return NextResponse.json(
            { success: false, error: "Payment not found" },
            { status: 404 }
          );
        }

        if (payment.status === PaymentStatus.CLEARED) {
          return NextResponse.json(
            { success: false, error: "Payment is already completed" },
            { status: 400 }
          );
        }

        if (payment.status !== PaymentStatus.POSTED) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Payment must be in POSTED status before it can be marked as completed",
            },
            { status: 400 }
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

    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to complete payment",
      },
      { status: 500 }
    );
  }
}
