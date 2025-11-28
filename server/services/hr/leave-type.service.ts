import { LeaveType, type LeaveTypeDoc } from "@/server/models/hr.models";

interface ListOptions {
  limit?: number;
}

export class LeaveTypeService {
  static async list(orgId: string, search?: string, options: ListOptions = {}) {
    const query: Record<string, unknown> = { orgId, isDeleted: false };
    if (search) {
      // SECURITY: Escape regex special characters to prevent ReDoS
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: new RegExp(escapedSearch, "i") },
        { code: new RegExp(escapedSearch, "i") },
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
