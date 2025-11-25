import { PayrollRun, type PayrollRunDoc } from "@/server/models/hr.models";
import { logger } from "@/lib/logger";
import { PayrollFinanceIntegration } from "@/server/services/hr/payroll-finance.integration";

export interface PayrollRunFilters {
  orgId: string;
  status?: PayrollRunDoc["status"];
}

export interface CreatePayrollRunPayload {
  orgId: string;
  name: string;
  periodStart: Date;
  periodEnd: Date;
}

export class PayrollService {
  static async list(filters: PayrollRunFilters) {
    const query: Record<string, unknown> = {
      orgId: filters.orgId,
      isDeleted: false,
    };
    if (filters.status) {
      query.status = filters.status;
    }
    return PayrollRun.find(query)
      .sort({ periodEnd: -1 })
      .lean<PayrollRunDoc>()
      .exec();
  }

  static async create(payload: CreatePayrollRunPayload) {
    return PayrollRun.create({
      orgId: payload.orgId,
      name: payload.name,
      periodStart: payload.periodStart,
      periodEnd: payload.periodEnd,
      status: "DRAFT",
      lines: [],
      totals: {
        baseSalary: 0,
        allowances: 0,
        overtime: 0,
        deductions: 0,
        gosi: 0,
        net: 0,
      },
      employeeCount: 0,
    });
  }

  static async existsOverlap(
    orgId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    return PayrollRun.exists({
      orgId,
      isDeleted: false,
      periodStart: { $lte: periodEnd },
      periodEnd: { $gte: periodStart },
    });
  }

  static async getById(orgId: string, runId: string) {
    return PayrollRun.findOne({ orgId, _id: runId, isDeleted: false }).exec();
  }

  static async updateCalculation(
    orgId: string,
    runId: string,
    lines: PayrollRunDoc["lines"],
    status: PayrollRunDoc["status"] = "IN_REVIEW",
  ) {
    const totals = lines.reduce(
      (acc, line) => {
        acc.baseSalary += line.baseSalary || 0;
        acc.allowances += line.allowances || 0;
        acc.overtime += line.overtimeAmount || 0;
        acc.deductions += line.deductions || 0;
        acc.gosi += line.gosiContribution || 0;
        acc.net += line.netPay || 0;
        return acc;
      },
      {
        baseSalary: 0,
        allowances: 0,
        overtime: 0,
        deductions: 0,
        gosi: 0,
        net: 0,
      },
    );

    return PayrollRun.findOneAndUpdate(
      { orgId, _id: runId, isDeleted: false },
      {
        lines,
        status,
        calculatedAt: new Date(),
        employeeCount: lines.length,
        totals: {
          baseSalary: Math.round(totals.baseSalary * 100) / 100,
          allowances: Math.round(totals.allowances * 100) / 100,
          overtime: Math.round(totals.overtime * 100) / 100,
          deductions: Math.round(totals.deductions * 100) / 100,
          gosi: Math.round(totals.gosi * 100) / 100,
          net: Math.round(totals.net * 100) / 100,
        },
      },
      { new: true },
    ).exec();
  }

  static async updateExportReference(
    orgId: string,
    runId: string,
    reference: string,
  ) {
    return PayrollRun.findOneAndUpdate(
      { orgId, _id: runId, isDeleted: false },
      { exportReference: reference },
      { new: true },
    ).exec();
  }

  static async updateStatus(
    orgId: string,
    runId: string,
    status: PayrollRunDoc["status"],
  ) {
    const run = await PayrollRun.findOneAndUpdate(
      { orgId, _id: runId, isDeleted: false },
      { status },
      { new: true },
    ).exec();

    if (run && status === "LOCKED" && !run.financePosted) {
      try {
        await PayrollFinanceIntegration.postRun(run);
      } catch (error) {
        logger.error("Failed to post payroll run to finance", {
          runId,
          error,
        });
      }
    }

    return run;
  }
}
