/**
 * @description Manages individual Chart of Accounts entries by ID.
 * GET retrieves account details with balance. PUT updates account properties.
 * DELETE deactivates account (soft delete if has transactions).
 * @route GET /api/finance/accounts/[id]
 * @route PUT /api/finance/accounts/[id]
 * @route DELETE /api/finance/accounts/[id]
 * @access Private - Users with FINANCE:VIEW/UPDATE/DELETE permission
 * @param {string} id - Account ID (MongoDB ObjectId)
 * @returns {Object} account: { code, name, type, balance, parentId }
 * @throws {401} If not authenticated
 * @throws {403} If lacking FINANCE permission
 * @throws {404} If account not found
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { dbConnect } from "@/lib/mongodb-unified";
import ChartAccount from "@/server/models/finance/ChartAccount";
import LedgerEntry from "@/server/models/finance/LedgerEntry";
import { runWithContext } from "@/server/lib/authContext";
import { requirePermission } from "@/config/rbac.config";
import { Types } from "mongoose";
import { z } from "zod";
import { forbiddenError, handleApiError, isForbidden, unauthorizedError } from "@/server/utils/errorResponses";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const UpdateAccountSchema = z.object({
  accountName: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  taxable: z.boolean().optional(),
  vatRate: z.number().min(0).max(100).optional(), // 0-100 percentage
  isActive: z.boolean().optional(),
});

// ============================================================================
// HELPER: Get User Session
// ============================================================================

async function getUserSession(_req: NextRequest) {
  const user = await getSessionUser(_req);

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
  };
}

// ============================================================================
// GET /api/finance/accounts/[id] - Get account details
// ============================================================================

import type { RouteContext } from "@/lib/types/route-context";

import { logger } from "@/lib/logger";
export async function GET(
  req: NextRequest,
  context: RouteContext<{ id: string }>,
) {
  try {
    await dbConnect();

    // Auth check
    const user = await getUserSession(req);
    if (!user) {
      return unauthorizedError();
    }

    // Authorization check
    requirePermission(user.role, "finance.accounts.read");

    // Resolve params (Next.js 15 provides params as a Promise)
    const _params = await Promise.resolve(context.params);

    // Validate account ID
    if (!Types.ObjectId.isValid(_params.id)) {
      return NextResponse.json(
        { error: "Invalid account ID" },
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
        // Get account
        const account = await ChartAccount.findOne({
          _id: new Types.ObjectId(_params.id),
          orgId: new Types.ObjectId(user.orgId),
        });

        if (!account) {
          return NextResponse.json(
            { error: "Account not found" },
            { status: 404 },
          );
        }

        // Get parent account if exists (with tenant isolation)
        let parent = null;
        if (account.parentId) {
          parent = await ChartAccount.findOne({
            _id: account.parentId,
            orgId: new Types.ObjectId(user.orgId),
          }).lean();
        }

        // Get child accounts
        const children = await ChartAccount.find({
          orgId: new Types.ObjectId(user.orgId),
          parentId: account._id,
        }).lean();

        // Get current balance from most recent ledger entry
        const latestEntry = await LedgerEntry.findOne({
          orgId: new Types.ObjectId(user.orgId),
          accountId: account._id,
        })
          .sort({ date: -1, createdAt: -1 })
          .lean();

        const currentBalance = latestEntry
          ? (latestEntry as { runningBalance?: number }).runningBalance || 0
          : 0;

        return NextResponse.json({
          success: true,
          data: {
            ...account.toObject(),
            parent,
            children,
            currentBalance,
          },
        });
      },
    );
  } catch (error) {
    logger.error("GET /api/finance/accounts/[id] error:", error);

    if (isForbidden(error)) {
      return forbiddenError("Access denied to account");
    }

    return handleApiError(error);
  }
}

// ============================================================================
// PUT /api/finance/accounts/[id] - Update account
// ============================================================================

export async function PUT(
  req: NextRequest,
  context: RouteContext<{ id: string }>,
) {
  try {
    await dbConnect();

    // Auth check
    const user = await getUserSession(req);
    if (!user) {
      return unauthorizedError();
    }

    // Authorization check
    requirePermission(user.role, "finance.accounts.update");

    // Resolve params (Next.js 15 provides params as a Promise)
    const _params = await Promise.resolve(context.params);

    // Validate account ID
    if (!Types.ObjectId.isValid(_params.id)) {
      return NextResponse.json(
        { error: "Invalid account ID" },
        { status: 400 },
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validated = UpdateAccountSchema.parse(body);

    // Execute with proper context
    return await runWithContext(
      {
        userId: user.userId,
        orgId: user.orgId,
        role: user.role,
        timestamp: new Date(),
      },
      async () => {
        // Get account
        const account = await ChartAccount.findOne({
          _id: new Types.ObjectId(_params.id),
          orgId: new Types.ObjectId(user.orgId),
        });

        if (!account) {
          return NextResponse.json(
            { error: "Account not found" },
            { status: 404 },
          );
        }

        // Update fields (only allow updating certain fields)
        if (validated.accountName !== undefined)
          account.accountName = validated.accountName;
        if (validated.description !== undefined)
          account.description = validated.description;
        if (validated.taxable !== undefined)
          account.taxable = validated.taxable;
        if (validated.vatRate !== undefined)
          account.vatRate = validated.vatRate;

        // Apply same safeguards as DELETE when deactivating
        if (
          validated.isActive !== undefined &&
          !validated.isActive &&
          account.isActive
        ) {
          // Check for ledger entries
          const hasEntries = await LedgerEntry.exists({
            orgId: new Types.ObjectId(user.orgId),
            accountId: account._id,
          });

          if (hasEntries) {
            return NextResponse.json(
              { error: "Cannot deactivate account with ledger entries" },
              { status: 400 },
            );
          }

          // Check for child accounts
          const hasChildren = await ChartAccount.exists({
            orgId: new Types.ObjectId(user.orgId),
            parentId: account._id,
          });

          if (hasChildren) {
            return NextResponse.json(
              { error: "Cannot deactivate account with child accounts" },
              { status: 400 },
            );
          }

          account.isActive = false;
        } else if (validated.isActive !== undefined) {
          account.isActive = validated.isActive;
        }

        await account.save();

        return NextResponse.json({
          success: true,
          data: account,
        });
      },
    );
  } catch (error) {
    logger.error("PUT /api/finance/accounts/[id] error:", error);

    if (isForbidden(error)) {
      return forbiddenError("Access denied to update account");
    }

    return handleApiError(error);
  }
}

// ============================================================================
// DELETE /api/finance/accounts/[id] - Deactivate account (soft delete)
// ============================================================================

export async function DELETE(
  req: NextRequest,
  context: RouteContext<{ id: string }>,
) {
  try {
    await dbConnect();

    // Auth check
    const user = await getUserSession(req);
    if (!user) {
      return unauthorizedError();
    }

    // Authorization check
    requirePermission(user.role, "finance.accounts.delete");

    // Resolve params (Next.js 15 provides params as a Promise)
    const _params = await Promise.resolve(context.params);

    // Validate account ID
    if (!Types.ObjectId.isValid(_params.id)) {
      return NextResponse.json(
        { error: "Invalid account ID" },
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
        // Get account
        const account = await ChartAccount.findOne({
          _id: new Types.ObjectId(_params.id),
          orgId: new Types.ObjectId(user.orgId),
        });

        if (!account) {
          return NextResponse.json(
            { error: "Account not found" },
            { status: 404 },
          );
        }

        // Prevent deletion if ledger entries exist for this account
        const hasEntries = await LedgerEntry.exists({
          orgId: new Types.ObjectId(user.orgId),
          accountId: account._id,
        });

        if (hasEntries) {
          return NextResponse.json(
            {
              error:
                "Cannot delete account with existing ledger entries. Use deactivation instead.",
            },
            { status: 400 },
          );
        }

        // Check if account has children
        const hasChildren = await ChartAccount.exists({
          orgId: new Types.ObjectId(user.orgId),
          parentId: account._id,
        });

        if (hasChildren) {
          return NextResponse.json(
            {
              error:
                "Cannot delete account with child accounts. Delete children first or deactivate instead.",
            },
            { status: 400 },
          );
        }

        // Soft delete by setting isActive = false
        account.isActive = false;
        await account.save();

        return NextResponse.json({
          success: true,
          message: "Account deactivated successfully",
          data: account,
        });
      },
    );
  } catch (error) {
    logger.error("DELETE /api/finance/accounts/[id] error:", error);

    if (isForbidden(error)) {
      return forbiddenError("Access denied to delete account");
    }

    return handleApiError(error);
  }
}
