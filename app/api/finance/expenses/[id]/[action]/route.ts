/**
 * @description Handles expense approval workflow actions.
 * POST submit: Submits draft expense for approval.
 * POST approve: Approves pending expense.
 * POST reject: Rejects pending expense with comments.
 * @route POST /api/finance/expenses/[id]/submit
 * @route POST /api/finance/expenses/[id]/approve
 * @route POST /api/finance/expenses/[id]/reject
 * @access Private - Users with FINANCE:APPROVE permission
 * @param {string} id - Expense ID (MongoDB ObjectId)
 * @param {string} action - Action type (submit, approve, reject)
 * @param {Object} body - comments (optional rejection reason)
 * @returns {Object} expense: updated expense with new status
 * @throws {401} If not authenticated
 * @throws {403} If lacking FINANCE:APPROVE permission
 * @throws {404} If expense not found
 * @throws {409} If status transition not allowed
 */
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { Expense } from "@/server/models/finance/Expense";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
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

const ApprovalSchema = z.object({
  comments: z.string().optional(),
});

import type { RouteContext } from "@/lib/types/route-context";

import { logger } from "@/lib/logger";
/**
 * POST /api/finance/expenses/:id/submit|approve|reject
 */
export async function POST(
  req: NextRequest,
  context: RouteContext<{ id: string; action: string }>,
) {
  const rateLimitResponse = enforceRateLimit(req, {
    requests: 30,
    windowMs: 60_000,
    keyPrefix: "finance:expenses:action",
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
      return validationError("Invalid expense ID");
    }

    // Use typed action parameter from route context
    const action = _params.action;

    // Authorization check based on action
    if (action === "submit") {
      requirePermission(user.role, "finance.expenses.submit");
    } else if (action === "approve") {
      requirePermission(user.role, "finance.expenses.approve");
    } else if (action === "reject") {
      requirePermission(user.role, "finance.expenses.reject");
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
        const expense = await Expense.findOne({
          _id: _params.id,
          orgId: user.orgId,
        });

        if (!expense) {
          return notFoundError("Expense");
        }

        if (action === "submit") {
          if (expense.status !== "DRAFT") {
            return NextResponse.json(
              { success: false, error: "Only draft expenses can be submitted" },
              { status: 400 },
            );
          }

          await expense.submit();
          await expense.save();

          return NextResponse.json({
            success: true,
            data: expense,
            message: "Expense submitted for approval",
          });
        }

        if (action === "approve") {
          if (expense.status !== "SUBMITTED") {
            return NextResponse.json(
              {
                success: false,
                error: "Only submitted expenses can be approved",
              },
              { status: 400 },
            );
          }

          const body = await req.json();
          const { comments } = ApprovalSchema.parse(body);

          await expense.approve(new Types.ObjectId(user.userId), comments);
          await expense.save();

          return NextResponse.json({
            success: true,
            data: expense,
            message: "Expense approved",
          });
        }

        if (action === "reject") {
          if (expense.status !== "SUBMITTED") {
            return NextResponse.json(
              {
                success: false,
                error: "Only submitted expenses can be rejected",
              },
              { status: 400 },
            );
          }

          const body = await req.json();
          const { comments } = ApprovalSchema.parse(body);

          if (!comments) {
            return NextResponse.json(
              { success: false, error: "Rejection reason is required" },
              { status: 400 },
            );
          }

          await expense.reject(new Types.ObjectId(user.userId), comments);
          await expense.save();

          return NextResponse.json({
            success: true,
            data: expense,
            message: "Expense rejected",
          });
        }

        // Should never reach here due to earlier check
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 },
        );
      },
    );
  } catch (error) {
    logger.error("Error processing expense action:", error);

    if (isForbidden(error)) {
      return forbiddenError("Access denied to expense");
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
