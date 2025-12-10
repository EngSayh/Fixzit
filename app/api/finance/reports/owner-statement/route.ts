import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb-unified";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { runWithContext } from "@/server/lib/authContext";
import { requirePermission } from "@/config/rbac.config";
import { ownerStatement } from "@/server/finance/reporting.service";
import { decimal128ToMinor } from "@/server/lib/money";
import { Types } from "mongoose";
import { logger } from "@/lib/logger";
import { forbiddenError, handleApiError, isForbidden, unauthorizedError, validationError } from "@/server/utils/errorResponses";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const user = await getSessionUser(req);
    if (!user) {
      return unauthorizedError();
    }

    requirePermission(user.role, "finance.reports.owner-statement");

    return await runWithContext(
      {
        userId: user.id,
        orgId: user.orgId,
        role: user.role,
        timestamp: new Date(),
      },
      async () => {
        const { searchParams } = new URL(req.url);
        const propertyId = searchParams.get("propertyId");
        if (!propertyId) {
          return validationError("propertyId is required");
        }

        const fromParam = searchParams.get("from");
        const toParam = searchParams.get("to");
        const now = new Date();

        const from = fromParam
          ? new Date(fromParam)
          : new Date(now.getFullYear(), now.getMonth(), 1);
        const to = toParam ? new Date(toParam) : now;

        const result = await ownerStatement(
          {
            userId: user.id,
            orgId: user.orgId,
            role: user.role,
            timestamp: new Date(),
          },
          propertyId,
          from,
          to,
        );

        const decimalZero = Types.Decimal128.fromString("0");
        const toMajor = (value: bigint) => Number(value) / 100;

        const lines = result.lines.map((line) => {
          const debitMinor = decimal128ToMinor(
            (line.debit as Types.Decimal128) ?? decimalZero,
          );
          const creditMinor = decimal128ToMinor(
            (line.credit as Types.Decimal128) ?? decimalZero,
          );

          return {
            accountId: line.accountId?.toString?.() ?? "",
            accountCode: line.code ?? line.accountCode ?? "",
            accountName: line.name ?? line.accountName ?? "",
            accountType: line.type,
            debit: toMajor(debitMinor),
            credit: toMajor(creditMinor),
          };
        });

        return NextResponse.json({
          propertyId,
          from: from.toISOString(),
          to: to.toISOString(),
          opening: toMajor(result.opening),
          charges: toMajor(result.charges),
          receipts: toMajor(result.receipts),
          ending: toMajor(result.ending),
          lines,
        });
      },
    );
  } catch (error) {
    logger.error("GET /api/finance/reports/owner-statement error:", error);
    if (isForbidden(error)) {
      return forbiddenError("Access denied to owner statement report");
    }
    return handleApiError(error);
  }
}
