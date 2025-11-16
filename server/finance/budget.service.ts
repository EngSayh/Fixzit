import Budget from '../models/finance/Budget';
import { RequestContext } from '../lib/authContext';
import { ForbiddenError } from '../lib/errors';
import { minorToDecimal128 } from '../lib/money';
import { log } from '../lib/logger';

async function requestDoAApproval(ctx: RequestContext, budgetId: string) {
  log(`DoA approval requested for budget ${budgetId}`);
  return { approved: true };
}

export async function createBudget(ctx: RequestContext, payload: { propertyId: string, period: string, amount: number }) {
  if (!['Finance', 'Admin'].includes(ctx.role)) throw new ForbiddenError('Only Finance/Admin can create budgets');
  const minor = BigInt(Math.round(payload.amount * 100));
  const amountMinor = minorToDecimal128(minor);
  const budget = await Budget.create({ orgId: ctx.orgId, propertyId: payload.propertyId, period: payload.period, amountMinor, createdBy: ctx.userId });
  await requestDoAApproval(ctx, budget._id.toString());
  return budget;
}
