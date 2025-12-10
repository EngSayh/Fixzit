import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb-unified";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { runWithContext } from "@/server/lib/authContext";
import { requirePermission } from "@/config/rbac.config";
import { balanceSheet } from "@/server/finance/reporting.service";
import { logger } from "@/lib/logger";
import { forbiddenError, handleApiError, isForbidden, unauthorizedError } from "@/server/utils/errorResponses";

export async function GET(req: NextRequest) {
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
