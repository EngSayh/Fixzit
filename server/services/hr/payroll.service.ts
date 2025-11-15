import { PayrollRun, type PayrollRunDoc } from '@/server/models/hr.models';

export interface PayrollRunFilters {
  orgId: string;
  status?: PayrollRunDoc['status'];
}

export interface CreatePayrollRunPayload {
  orgId: string;
  name: string;
  periodStart: Date;
  periodEnd: Date;
}

export class PayrollService {
  static async list(filters: PayrollRunFilters) {
    const query: Record<string, unknown> = { orgId: filters.orgId, isDeleted: false };
    if (filters.status) {
      query.status = filters.status;
    }
    return PayrollRun.find(query).sort({ periodEnd: -1 }).lean<PayrollRunDoc>().exec();
  }

  static async create(payload: CreatePayrollRunPayload) {
    return PayrollRun.create({
      orgId: payload.orgId,
      name: payload.name,
      periodStart: payload.periodStart,
      periodEnd: payload.periodEnd,
      status: 'DRAFT',
      lines: [],
    });
  }

  static async existsOverlap(orgId: string, periodStart: Date, periodEnd: Date) {
    return PayrollRun.exists({
      orgId,
      isDeleted: false,
      periodStart: { $lte: periodEnd },
      periodEnd: { $gte: periodStart },
    });
  }
}
