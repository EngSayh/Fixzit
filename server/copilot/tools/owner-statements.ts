import { db } from "@/lib/mongodb-unified";
import { OwnerStatement } from "@/server/models/OwnerStatement";
import { ensureToolAllowed } from "./guard";
import { CopilotSession } from "../session";
import type { ToolExecutionResult } from "./types";

export async function ownerStatements(
  session: CopilotSession,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  await ensureToolAllowed(session, "ownerStatements");
  await db;

  const ownerId = input.ownerId || session.userId;
  const year = Number(input.year) || new Date().getFullYear();
  const period = input.period || "YTD";

  interface StatementDoc {
    orgId: string;
    ownerId: string;
    period: string;
    year: number;
    currency: string;
    totals?: { income?: number; expenses?: number; net?: number };
    lineItems?: Array<{
      date: Date;
      description: string;
      type: string;
      amount: number;
      reference?: string;
    }>;
  }
  // eslint-disable-next-line local/require-lean -- NO_LEAN: needs full document for data mapping
  const statements = (await OwnerStatement.find({
    orgId: session.tenantId,
    ownerId,
    ...(period !== "YTD" ? { period } : {}),
    ...(year ? { year } : {}),
  })) as unknown as StatementDoc[];

  if (!statements || statements.length === 0) {
    return {
      success: true,
      intent: "ownerStatements",
      message:
        session.locale === "ar"
          ? "لا تتوفر بيانات حالياً لهذه الفترة."
          : "No statement data is available for the selected period.",
      data: [],
    };
  }

  const totals = statements.reduce(
    (acc, stmt) => {
      acc.income += stmt.totals?.income || 0;
      acc.expenses += stmt.totals?.expenses || 0;
      acc.net += stmt.totals?.net || 0;
      return acc;
    },
    { income: 0, expenses: 0, net: 0 },
  );

  return {
    success: true,
    intent: "ownerStatements",
    message:
      session.locale === "ar"
        ? "تم تجهيز ملخص بيان المالك."
        : "Owner statement summary is ready.",
    data: {
      currency: statements[0].currency,
      totals,
      statements: statements.map((stmt) => ({
        period: stmt.period,
        year: stmt.year,
        totals: stmt.totals,
        lineItems:
          stmt.lineItems?.map((item) => ({
            date: item.date,
            description: item.description,
            type: item.type,
            amount: item.amount,
            reference: item.reference,
          })) || [],
      })),
    },
  };
}
