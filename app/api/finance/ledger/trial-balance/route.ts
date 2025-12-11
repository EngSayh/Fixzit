/**
 * @description Generates trial balance report showing all account balances.
 * Verifies that total debits equal total credits.
 * Used for period-end closing and audit preparation.
 * @route GET /api/finance/ledger/trial-balance
 * @access Private - Users with FINANCE:VIEW permission
 * @param {string} asOfDate - Balance date (ISO date, defaults to today)
 * @returns {Object} accounts: array with debit/credit balances, totals
 * @throws {401} If not authenticated
 * @throws {403} If lacking FINANCE permission
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { runWithContext } from "@/server/lib/authContext";
import { requirePermission } from "@/config/rbac.config";
import { forbiddenError, handleApiError, isForbidden, unauthorizedError } from "@/server/utils/errorResponses";

import { dbConnect } from "@/lib/mongodb-unified";
import { trialBalance as trialBalanceReport } from "@/server/finance/reporting.service";
import { decimal128ToMinor } from "@/server/lib/money";

import { Types } from "mongoose";

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
// GET /api/finance/ledger/trial-balance - Get trial balance report
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Auth check
    const user = await getUserSession(req);
    if (!user) {
      return unauthorizedError();
    }

    // Authorization check
    requirePermission(user.role, "finance.ledger.trial-balance");

    // Execute with proper context
    return await runWithContext(
      {
        userId: user.userId,
        orgId: user.orgId,
        role: user.role,
        timestamp: new Date(),
      },
      async () => {
        // Parse query parameters
        const { searchParams } = new URL(req.url);
        const year = parseInt(
          searchParams.get("year") || new Date().getFullYear().toString(),
          10,
        );
        const period = parseInt(searchParams.get("period") || "12", 10); // 1-12
        const asOfDateParam = searchParams.get("asOfDate");

        // Determine as-of date
        let asOfDate: Date;
        if (asOfDateParam) {
          asOfDate = new Date(asOfDateParam);
        } else {
          // Default: last day of the specified period
          asOfDate = new Date(year, period, 0); // Day 0 = last day of previous month
        }

        const periodStart = new Date(year, period - 1, 1);
        const periodEnd = asOfDate;

        const result = await trialBalanceReport(
          {
            userId: user.userId,
            orgId: user.orgId,
            role: user.role,
            timestamp: new Date(),
          },
          periodStart,
          periodEnd,
        );

        const decimalZero = Types.Decimal128.fromString("0");
        const toMajor = (minor: bigint) => Number(minor) / 100;

        const accounts = result.rows.map((row) => {
          const debitMinor = decimal128ToMinor(
            (row.debit as Types.Decimal128) ?? decimalZero,
          );
          const creditMinor = decimal128ToMinor(
            (row.credit as Types.Decimal128) ?? decimalZero,
          );

          return {
            accountId: row.accountId?.toString?.() ?? "",
            accountCode: row.code ?? row.accountCode ?? "",
            accountName: row.name ?? row.accountName ?? "",
            accountType: row.type,
            debit: toMajor(debitMinor),
            credit: toMajor(creditMinor),
            balance: toMajor(debitMinor - creditMinor),
            level: 0,
            hasChildren: false,
          };
        });

        const totalDebits = toMajor(result.totDr);
        const totalCredits = toMajor(result.totCr);

        return NextResponse.json({
          year,
          period,
          asOfDate: asOfDate.toISOString(),
          accounts,
          totalDebits,
          totalCredits,
          isBalanced: result.balanced,
          difference: totalDebits - totalCredits,
        });
      },
    );
  } catch (error) {
    logger.error("GET /api/finance/ledger/trial-balance error:", error);

    if (isForbidden(error)) {
      return forbiddenError("Access denied to trial balance");
    }

    return handleApiError(error);
  }
}
