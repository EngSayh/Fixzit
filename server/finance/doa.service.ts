import { Types } from 'mongoose';
import { RequestContext } from '@/server/lib/authContext';
import { FMApproval } from '@/server/models/FMApproval';
import { log } from '@/server/lib/logger';

interface BudgetApprovalPayload {
  budgetId: string;
  propertyId: string;
  period: string;
  amount: number;
  currency?: string;
}

export async function submitBudgetForApproval(
  ctx: RequestContext,
  payload: BudgetApprovalPayload
): Promise<void> {
  try {
    await FMApproval.create({
      orgId: ctx.orgId,
      approvalNumber: undefined,
      type: 'BUDGET',
      entityType: 'Budget',
      entityId: new Types.ObjectId(payload.budgetId),
      entityNumber: `BUD-${payload.period}-${payload.propertyId}`,
      amount: payload.amount,
      currency: payload.currency ?? 'SAR',
      thresholdLevel: 'L1',
      workflowId: new Types.ObjectId(),
      currentStage: 0,
      totalStages: 1,
      approverId: ctx.userId,
      approverName: 'System',
      approverEmail: 'noreply@fixzit.com',
      approverRole: ctx.role,
      status: 'PENDING',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      lines: [],
      history: [],
      postings: [],
      totalDebit: 0,
      totalCredit: 0,
      isBalanced: true,
      fiscalYear: new Date().getFullYear(),
      fiscalPeriod: new Date().getMonth() + 1,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    } as unknown as Parameters<typeof FMApproval.create>[0]);

    log('Budget submitted for approval', 'info', {
      budgetId: payload.budgetId,
      orgId: ctx.orgId,
    });
  } catch (error) {
    log('Budget DoA submission failed', 'error', { error });
    throw error;
  }
}
