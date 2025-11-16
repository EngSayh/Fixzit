import { Types } from 'mongoose';
import { logger } from '@/lib/logger';
import { PayrollRun, type PayrollRunDoc, type PayrollLineDoc } from '@/server/models/hr.models';
import ChartAccountModel from '@/server/models/finance/ChartAccount';

const DEFAULT_ACCOUNT_CODES = {
  salaryExpense: '5200',
  bank: '1010',
  gosiEmployee: '2100',
  gosiEmployer: '2101',
  deductionsPayable: '2105',
} as const;

type AccountCodeKey = keyof typeof DEFAULT_ACCOUNT_CODES;

function toObjectId(value?: string | Types.ObjectId | null) {
  if (!value) return undefined;
  if (value instanceof Types.ObjectId) return value;
  return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : undefined;
}

async function getAccount(orgId: Types.ObjectId, code: string, label: string) {
  const account = await ChartAccountModel.findOne({ orgId, accountCode: code });
  if (!account) {
    throw new Error(
      `Chart account ${code} (${label}) not found. Configure it in Chart of Accounts before posting payroll.`
    );
  }
  return account;
}

function sumGosi(lines: PayrollLineDoc[]) {
  const initial = { employee: 0, employer: 0 };

  const breakdown = lines.reduce((acc, line) => {
    const gosi = line.gosiBreakdown || {};
    acc.employee +=
      (gosi.annuitiesEmployee || 0) +
      (gosi.sanedEmployee || 0);
    acc.employer +=
      (gosi.annuitiesEmployer || 0) +
      (gosi.sanedEmployer || 0) +
      (gosi.occupationalHazards || 0);

    return acc;
  }, initial);

  if (breakdown.employee === 0) {
    breakdown.employee = lines.reduce((sum, line) => sum + (line.gosiContribution || 0), 0);
  }

  return breakdown;
}

export class PayrollFinanceIntegration {
  static async postRun(run: PayrollRunDoc, options?: { userId?: string }) {
    if (run.financePosted) {
      return;
    }

    if (!run.lines || run.lines.length === 0) {
      logger.warn('Skipping payroll finance posting - run has no lines', { runId: run._id?.toString() });
      return;
    }

    const orgObjectId = toObjectId(run.orgId);
    if (!orgObjectId) {
      logger.error('Unable to post payroll to finance: invalid orgId', { runId: run._id?.toString(), orgId: run.orgId });
      return;
    }

    try {
      const { lines } = run;
      const totals = run.totals || { baseSalary: 0, allowances: 0, overtime: 0, deductions: 0, gosi: 0, net: 0 };
      const earnings = (totals.baseSalary || 0) + (totals.allowances || 0) + (totals.overtime || 0);
      const netPay = totals.net || 0;
      const deductionsTotal = totals.deductions || 0;
      const gosiTotals = sumGosi(lines);
      const otherDeductions = Math.max(0, deductionsTotal - gosiTotals.employee);

      if (earnings <= 0) {
        logger.warn('Skipping payroll finance posting - no earnings total', { runId: run._id?.toString() });
        return;
      }

      const postingService = (await import('@/server/services/finance/postingService')).default;

      const accounts: Record<AccountCodeKey, Awaited<ReturnType<typeof getAccount>>> = {
        salaryExpense: await getAccount(orgObjectId, DEFAULT_ACCOUNT_CODES.salaryExpense, 'Salary Expense'),
        bank: await getAccount(orgObjectId, DEFAULT_ACCOUNT_CODES.bank, 'Payroll Bank / Cash'),
        gosiEmployee: await getAccount(orgObjectId, DEFAULT_ACCOUNT_CODES.gosiEmployee, 'GOSI Employee Payable'),
        gosiEmployer: await getAccount(orgObjectId, DEFAULT_ACCOUNT_CODES.gosiEmployer, 'GOSI Employer Payable'),
        deductionsPayable: await getAccount(orgObjectId, DEFAULT_ACCOUNT_CODES.deductionsPayable, 'Payroll Deductions / Other Payables'),
      };

      const periodLabel = new Intl.DateTimeFormat('en', {
        month: 'long',
        year: 'numeric',
      }).format(run.periodEnd || new Date());

      const description = `Payroll ${periodLabel}`;
      const journalLines = [];

      const salaryExpenseAmount = Math.round((earnings + gosiTotals.employer) * 100) / 100;
      journalLines.push({
        accountId: accounts.salaryExpense._id,
        debit: salaryExpenseAmount,
        credit: 0,
        description,
      });

      if (gosiTotals.employee > 0) {
        journalLines.push({
          accountId: accounts.gosiEmployee._id,
          debit: 0,
          credit: Math.round(gosiTotals.employee * 100) / 100,
          description: `${description} - GOSI Employee`,
        });
      }

      if (gosiTotals.employer > 0) {
        journalLines.push({
          accountId: accounts.gosiEmployer._id,
          debit: 0,
          credit: Math.round(gosiTotals.employer * 100) / 100,
          description: `${description} - GOSI Employer`,
        });
      }

      if (otherDeductions > 0) {
        journalLines.push({
          accountId: accounts.deductionsPayable._id,
          debit: 0,
          credit: Math.round(otherDeductions * 100) / 100,
          description: `${description} - Deductions`,
        });
      }

      if (netPay > 0) {
        journalLines.push({
          accountId: accounts.bank._id,
          debit: 0,
          credit: Math.round(netPay * 100) / 100,
          description: `${description} - Payroll Disbursement`,
        });
      }

      const userObjectId =
        toObjectId(options?.userId) ||
        toObjectId(run.updatedBy as unknown as Types.ObjectId) ||
        toObjectId(run.createdBy as unknown as Types.ObjectId) ||
        orgObjectId;

      const journal = await postingService.createJournal({
        orgId: orgObjectId,
        journalDate: run.periodEnd || new Date(),
        description,
        sourceType: 'EXPENSE',
        sourceId: run._id as Types.ObjectId,
        sourceNumber: run.name,
        lines: journalLines,
        userId: userObjectId!,
      });

      await postingService.postJournal(journal._id);

      await PayrollRun.updateOne(
        { _id: run._id },
        {
          financePosted: true,
          financeJournalId: journal._id,
          financeReference: journal.journalNumber,
          financePostedAt: new Date(),
        }
      ).exec();

      logger.info('Payroll run posted to finance', {
        runId: run._id?.toString(),
        journalId: journal._id.toString(),
      });
    } catch (error) {
      logger.error('Failed to post payroll run to finance', {
        runId: run._id?.toString(),
        error,
      });
      throw error;
    }
  }
}
