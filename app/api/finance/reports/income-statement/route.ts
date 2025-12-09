import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb-unified";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { runWithContext } from "@/server/lib/authContext";
import { requirePermission } from "@/config/rbac.config";
import { incomeStatement } from "@/server/finance/reporting.service";
import { decimal128ToMinor } from "@/server/lib/money";
import { Types } from "mongoose";
import { logger } from "@/lib/logger";
import { forbiddenError, handleApiError } from "@/server/utils/errorResponses";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    requirePermission(user.role, "finance.reports.income-statement");

    return await runWithContext(
      {
        userId: user.id,
        orgId: user.orgId,
        role: user.role,
        timestamp: new Date(),
      },
      async () => {
        const { searchParams } = new URL(req.url);
        const now = new Date();
        const year = parseInt(
          searchParams.get("year") || now.getFullYear().toString(),
          10,
        );
        const fromParam = searchParams.get("from");
        const toParam = searchParams.get("to");

        const from = fromParam ? new Date(fromParam) : new Date(year, 0, 1);
        const to = toParam
          ? new Date(toParam)
          : new Date(year, 11, 31, 23, 59, 59, 999);

        const result = await incomeStatement(
          {
            userId: user.id,
            orgId: user.orgId,
            role: user.role,
            timestamp: new Date(),
          },
          from,
          to,
        );

        const decimalZero = Types.Decimal128.fromString("0");
        const toMajor = (minor: bigint) => Number(minor) / 100;

        const rows = result.rows.map((row) => {
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
          };
        });

        return NextResponse.json({
          from: from.toISOString(),
          to: to.toISOString(),
          revenue: toMajor(result.revenue),
          expense: toMajor(result.expense),
          net: toMajor(result.net),
          rows,
        });
      },
    );
  } catch (error) {
    logger.error("GET /api/finance/reports/income-statement error:", error);
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return forbiddenError("Access denied to income statement report");
    }
    return handleApiError(error);
  }
}
