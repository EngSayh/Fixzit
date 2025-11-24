/**
 * Account Activity API Route - Finance Pack Phase 2
 *
 * Endpoint:
 * - GET /api/finance/ledger/account-activity/[accountId] - Get transaction history for account
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { runWithContext } from "@/server/lib/authContext";
import { requirePermission } from "@/server/lib/rbac.config";
import { dbConnect } from "@/lib/mongodb-unified";
import LedgerEntry from "@/server/models/finance/LedgerEntry";
import ChartAccount from "@/server/models/finance/ChartAccount";
import { Types } from "mongoose";

interface LedgerEntryDocument {
  _id: Types.ObjectId;
  debit: number;
  credit: number;
  journalDate: Date;
  createdAt: Date;
  [key: string]: unknown;
}

import { logger } from "@/lib/logger";
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
// GET /api/finance/ledger/account-activity/[accountId] - Account transaction history
// ============================================================================

export async function GET(
  req: NextRequest,
  context: { params: { accountId: string } | Promise<{ accountId: string }> },
) {
  try {
    await dbConnect();

    // Auth check
    const user = await getUserSession(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization check
    requirePermission(user.role, "finance.ledger.account-activity");

    // Resolve params
    const params =
      context.params &&
      typeof context.params === "object" &&
      "then" in context.params
        ? await context.params
        : context.params;

    // Validate account ID
    if (!Types.ObjectId.isValid(params.accountId)) {
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
        // Check account exists and belongs to org
        const account = await ChartAccount.findOne({
          _id: new Types.ObjectId(params.accountId),
          orgId: new Types.ObjectId(user.orgId),
        });

        if (!account) {
          return NextResponse.json(
            { error: "Account not found" },
            { status: 404 },
          );
        }

        // Parse query parameters
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const sourceType = searchParams.get("sourceType");
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = Math.min(
          parseInt(searchParams.get("limit") || "50", 10),
          100,
        );

        // Build query filter based on LedgerEntry schema fields
        const queryFilter: {
          orgId: Types.ObjectId;
          accountId: Types.ObjectId;
          journalDate?: { $gte?: Date; $lte?: Date };
        } = {
          orgId: new Types.ObjectId(user.orgId),
          accountId: new Types.ObjectId(params.accountId),
        };

        if (startDate || endDate) {
          queryFilter.journalDate = {};
          if (startDate) queryFilter.journalDate.$gte = new Date(startDate);
          if (endDate) queryFilter.journalDate.$lte = new Date(endDate);
        }

        // Note: sourceType filtering would require joining with Journal collection
        // For now, we'll filter in memory if needed

        // Calculate opening balance (balance before startDate if provided)
        let openingBalance = 0;
        if (startDate) {
          const entriesBeforeStart = (await LedgerEntry.find({
            orgId: new Types.ObjectId(user.orgId),
            accountId: new Types.ObjectId(params.accountId),
            journalDate: { $lt: new Date(startDate) },
          })
            .sort({ journalDate: 1, createdAt: 1 })
            .lean<LedgerEntryDocument>()
            .exec()) as unknown as LedgerEntryDocument[];

          openingBalance = entriesBeforeStart.reduce(
            (balance: number, entry) => {
              return balance + entry.debit - entry.credit;
            },
            0,
          );
        }

        // Get total count for pagination
        const totalTransactions = await LedgerEntry.countDocuments(queryFilter);

        // Get paginated transactions with running balance calculation
        const skip = (page - 1) * limit;
        const transactions = await LedgerEntry.find(queryFilter)
          .sort({ journalDate: 1, createdAt: 1 })
          .skip(skip)
          .limit(limit)
          .lean();

        // Calculate running balance for paginated transactions
        let runningBalance = openingBalance;

        // If not on first page, need to calculate balance up to this page
        if (page > 1) {
          const previousEntries = await LedgerEntry.find(queryFilter)
            .sort({ journalDate: 1, createdAt: 1 })
            .limit(skip)
            .lean();

          runningBalance = (previousEntries as LedgerEntryDocument[]).reduce(
            (balance: number, entry) => {
              return balance + entry.debit - entry.credit;
            },
            openingBalance,
          );
        }

        const transactionsWithBalance = (
          transactions as LedgerEntryDocument[]
        ).map((entry) => {
          runningBalance += entry.debit - entry.credit;
          return {
            _id: entry._id.toString(),
            date: entry.journalDate.toISOString(),
            journalNumber: entry.journalNumber,
            description: entry.description,
            sourceType: "JOURNAL", // Default - would need join to get actual sourceType
            sourceNumber: entry.journalId?.toString(),
            debit: entry.debit || 0,
            credit: entry.credit || 0,
            balance: runningBalance,
          };
        });

        // Filter by sourceType if provided (in-memory since it's not directly in LedgerEntry)
        const filteredTransactions = transactionsWithBalance;
        if (sourceType && sourceType !== "ALL") {
          // For now, skip filtering - would need Journal join
          // return transactionsWithBalance.filter(t => t.sourceType === sourceType);
        }

        // Calculate totals for the filtered period
        const allTransactions = await LedgerEntry.find(queryFilter)
          .sort({ journalDate: 1, createdAt: 1 })
          .lean();

        const allTyped = allTransactions as LedgerEntryDocument[];
        const totalDebits = allTyped.reduce(
          (sum: number, entry) => sum + (entry.debit || 0),
          0,
        );
        const totalCredits = allTyped.reduce(
          (sum: number, entry) => sum + (entry.credit || 0),
          0,
        );
        const closingBalance = openingBalance + totalDebits - totalCredits;

        return NextResponse.json({
          accountId: account._id.toString(),
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          openingBalance,
          closingBalance,
          transactions: filteredTransactions,
          totalTransactions,
          totalDebits,
          totalCredits,
          periodStart: startDate || new Date(0).toISOString(),
          periodEnd: endDate || new Date().toISOString(),
        });
      },
    );
  } catch (error) {
    logger.error(
      "GET /api/finance/ledger/account-activity/[accountId] error:",
      error,
    );

    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
