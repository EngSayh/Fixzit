import Budget from "../models/finance/Budget";
import { RequestContext } from "../lib/authContext";
import { ForbiddenError } from "../lib/errors";
import { minorToDecimal128 } from "../lib/money";
import { log } from "../lib/logger";
import { submitBudgetForApproval } from "./doa.service";

export async function createBudget(
  ctx: RequestContext,
  payload: { propertyId: string; period: string; amount: number },
) {
  if (!["FINANCE", "ADMIN", "SUPER_ADMIN"].includes(ctx.role))
    throw new ForbiddenError("Only Finance/Admin can create budgets");
  const minor = BigInt(Math.round(payload.amount * 100));
  const amountMinor = minorToDecimal128(minor);
  const budget = await Budget.create({
    orgId: ctx.orgId,
    propertyId: payload.propertyId,
    period: payload.period,
    amountMinor,
    createdBy: ctx.userId,
  });

  try {
    await submitBudgetForApproval(ctx, {
      budgetId: budget._id.toString(),
      propertyId: payload.propertyId,
      period: payload.period,
      amount: payload.amount,
      currency: (budget as { currency?: string }).currency,
    });
  } catch (error) {
    log("Failed to submit budget for DoA approval", "error");
    await Budget.deleteOne({ _id: budget._id });
    throw error;
  }

  return budget;
}
