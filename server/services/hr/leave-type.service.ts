import { LeaveType, type LeaveTypeDoc } from "@/server/models/hr.models";

interface ListOptions {
  limit?: number;
}

export class LeaveTypeService {
  static async list(orgId: string, search?: string, options: ListOptions = {}) {
    const query: Record<string, unknown> = { orgId, isDeleted: false };
    if (search) {
      query.$or = [
        { name: new RegExp(search, "i") },
        { code: new RegExp(search, "i") },
      ];
    }

    let cursor = LeaveType.find(query).sort({ name: 1 });
    if (options.limit) {
      cursor = cursor.limit(options.limit);
    }
    return cursor.lean<LeaveTypeDoc>().exec();
  }

  static async create(
    orgId: string,
    payload: Pick<
      LeaveTypeDoc,
      "code" | "name" | "description" | "isPaid" | "annualEntitlementDays"
    >,
  ) {
    return LeaveType.create({
      ...payload,
      orgId,
    });
  }
}
