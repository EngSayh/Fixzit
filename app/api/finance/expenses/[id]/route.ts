/**
 * @description Manages individual expense records by ID.
 * GET retrieves expense details with line items.
 * PUT updates expense (only in DRAFT status). DELETE cancels expense.
 * @route GET /api/finance/expenses/[id]
 * @route PUT /api/finance/expenses/[id]
 * @route DELETE /api/finance/expenses/[id]
 * @access Private - Users with FINANCE:VIEW/UPDATE permission
 * @param {string} id - Expense ID (MongoDB ObjectId)
 * @returns {Object} expense: { vendor, amount, status, lineItems }
 * @throws {401} If not authenticated
 * @throws {403} If lacking FINANCE permission
 * @throws {404} If expense not found
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
import { parseBodySafe } from "@/lib/api/parse-body";

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

import type { RouteContext } from "@/lib/types/route-context";

import { logger } from "@/lib/logger";
/**
 * GET /api/finance/expenses/:id
 */
export async function GET(
  req: NextRequest,
  context: RouteContext<{ id: string }>,
) {
  const rateLimitResponse = enforceRateLimit(req, {
    requests: 60,
    windowMs: 60_000,
    keyPrefix: "finance:expenses:read",
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getUserSession(req);
    if (!user) {
      return unauthorizedError();
    }
    if (!user) {
      return unauthorizedError();
    }
    if (!user) {
      return unauthorizedError();
    }

    // Authorization check
    requirePermission(user.role, "finance.expenses.read");

    // Resolve params (Next.js 15 provides params as a Promise)
    const _params = await Promise.resolve(context.params);

    if (!Types.ObjectId.isValid(_params.id)) {
      return validationError("Invalid expense ID");
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
          }).lean();

        if (!expense) {
          return notFoundError("Expense");
        }

        return NextResponse.json({
          success: true,
          data: expense,
        });
      },
    );
  } catch (error) {
    logger.error("Error fetching expense:", error);

    if (isForbidden(error)) {
      return forbiddenError("Access denied to expense");
    }

    return handleApiError(error);
  }
}

const UpdateExpenseSchema = z.object({
  expenseDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string().optional(),
    quantity: z.number().nonnegative().optional(),
    unitPrice: z.number().nonnegative().optional(),
    amount: z.number().nonnegative().optional(),
    taxRate: z.number().nonnegative().optional(),
    accountId: z.string().optional(),
  }).refine(
    (item) => Object.keys(item).length > 0,
    { message: "Line items cannot be empty objects" }
  )).optional(),
  subtotal: z.number().optional(),
  totalTax: z.number().optional(),
  totalAmount: z.number().optional(),
});

/**
 * PUT /api/finance/expenses/:id
 * Update expense (only if DRAFT status)
 */
export async function PUT(
  req: NextRequest,
  context: RouteContext<{ id: string }>,
) {
  const rateLimitResponse = enforceRateLimit(req, {
    requests: 30,
    windowMs: 60_000,
    keyPrefix: "finance:expenses:update",
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getUserSession(req);
    if (!user) {
      return unauthorizedError();
    }

    // Authorization check
    requirePermission(user.role, "finance.expenses.update");

    // Resolve params (Next.js 15 provides params as a Promise)
    const _params = await Promise.resolve(context.params);

    if (!Types.ObjectId.isValid(_params.id)) {
      return validationError("Invalid expense ID");
    }

    const { data: rawBody, error: parseError } = await parseBodySafe(req, {
      logPrefix: "[PATCH /api/finance/expenses/:id]",
    });
    if (parseError) {
      return NextResponse.json({ error: parseError }, { status: 400 });
    }
    const data = UpdateExpenseSchema.parse(rawBody);

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
          return NextResponse.json(
            { success: false, error: "Expense not found" },
            { status: 404 },
          );
        }

        // Only allow updates for DRAFT expenses
        if (expense.status !== "DRAFT") {
          return NextResponse.json(
            { success: false, error: "Only draft expenses can be updated" },
            { status: 400 },
          );
        }

        // Update expense
        Object.assign(expense, data);
        expense.updatedBy = new Types.ObjectId(user.userId);
        await expense.save();

        return NextResponse.json({
          success: true,
          data: expense,
          message: "Expense updated successfully",
        });
      },
    );
  } catch (error) {
    logger.error("Error updating expense:", error);

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

/**
 * DELETE /api/finance/expenses/:id
 * Cancel expense
 */
export async function DELETE(
  req: NextRequest,
  context: RouteContext<{ id: string }>,
) {
  const rateLimitResponse = enforceRateLimit(req, {
    requests: 30,
    windowMs: 60_000,
    keyPrefix: "finance:expenses:delete",
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getUserSession(req);
    if (!user) {
      return unauthorizedError();
    }

    // Authorization check
    requirePermission(user.role, "finance.expenses.delete");

    // Resolve params (Next.js 15 provides params as a Promise)
    const _params = await Promise.resolve(context.params);

    if (!Types.ObjectId.isValid(_params.id)) {
      return validationError("Invalid expense ID");
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

        // Only allow cancellation for non-PAID expenses
        if (expense.status === "PAID") {
          return NextResponse.json(
            { success: false, error: "Paid expenses cannot be cancelled" },
            { status: 400 },
          );
        }

        expense.status = "CANCELLED";
        expense.updatedBy = new Types.ObjectId(user.userId);
        await expense.save();

        return NextResponse.json({
          success: true,
          message: "Expense cancelled successfully",
        });
      },
    );
  } catch (error) {
    logger.error("Error cancelling expense:", error);

    if (isForbidden(error)) {
      return forbiddenError("Access denied to expense");
    }

    return handleApiError(error);
  }
}
