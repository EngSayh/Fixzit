/**
 * @description Generates balance sheet financial report.
 * Shows assets, liabilities, and equity as of specified date.
 * Supports JSON, PDF, and Excel output formats.
 * @route GET /api/finance/reports/balance-sheet
 * @access Private - Users with finance.reports.balance-sheet permission
 * @param {string} asOfDate - Report date (ISO date, defaults to today)
 * @param {string} format - Output format (json, pdf, excel)
 * @returns {Object} assets: total, liabilities: total, equity: total
 * @throws {401} If not authenticated
 * @throws {403} If lacking report permission
 */
import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb-unified";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { runWithContext } from "@/server/lib/authContext";
import { requirePermission } from "@/config/rbac.config";
import { balanceSheet } from "@/server/finance/reporting.service";
import { logger } from "@/lib/logger";
import { forbiddenError, handleApiError, isForbidden, unauthorizedError } from "@/server/utils/errorResponses";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

export async function GET(req: NextRequest) {
  // Rate limiting: 30 requests per minute per IP for report generation
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "finance-reports:balance-sheet",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await dbConnect();

    const user = await getSessionUser(req);
    if (!user) {
      return unauthorizedError();
    }

    requirePermission(user.role, "finance.reports.balance-sheet");

    return await runWithContext(
      {
        userId: user.id,
        orgId: user.orgId,
        role: user.role,
        timestamp: new Date(),
      },
      async () => {
        const { searchParams } = new URL(req.url);
        const asOfParam = searchParams.get("asOf");
        const asOf = asOfParam ? new Date(asOfParam) : new Date();

        const result = await balanceSheet(
          {
            userId: user.id,
            orgId: user.orgId,
            role: user.role,
            timestamp: new Date(),
          },
          asOf,
        );

        const toMajor = (value: bigint) => Number(value) / 100;

        return NextResponse.json({
          asOf: asOf.toISOString(),
          assets: toMajor(result.assets),
          liabilities: toMajor(result.liab),
          equity: toMajor(result.equity),
          equationOk: result.equationOk,
        });
      },
    );
  } catch (error) {
    logger.error("GET /api/finance/reports/balance-sheet error:", error);
    if (isForbidden(error)) {
      return forbiddenError("Access denied to balance sheet report");
    }
    return handleApiError(error);
  }
}
