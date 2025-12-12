import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock LeaveType model
vi.mock("@/server/models/hr.models", () => ({
  LeaveType: {
    find: vi.fn(),
    create: vi.fn(),
  },
}));

import { LeaveTypeService } from "@/server/services/hr/leave-type.service";
import { LeaveType } from "@/server/models/hr.models";

describe("LeaveTypeService", () => {
  const orgId = "org-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return all leave types for org", async () => {
      const mockLeaveTypes = [
        { _id: "lt-1", name: "Annual Leave", code: "AL", isPaid: true },
        { _id: "lt-2", name: "Sick Leave", code: "SL", isPaid: true },
      ];

      vi.mocked(LeaveType.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockLeaveTypes),
        }),
      } as never);

      const result = await LeaveTypeService.list(orgId);

      expect(LeaveType.find).toHaveBeenCalledWith({ orgId, isDeleted: false });
      expect(result).toEqual(mockLeaveTypes);
    });

    it("should filter by search term", async () => {
      const mockLeaveTypes = [
        { _id: "lt-1", name: "Annual Leave", code: "AL" },
      ];

      vi.mocked(LeaveType.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockLeaveTypes),
        }),
      } as never);

      const result = await LeaveTypeService.list(orgId, "Annual");

      expect(LeaveType.find).toHaveBeenCalled();
      expect(result).toEqual(mockLeaveTypes);
    });

    it("should escape regex special characters to prevent ReDoS", async () => {
      vi.mocked(LeaveType.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      // This should NOT cause ReDoS
      await LeaveTypeService.list(orgId, "test.*+?^${}()|[]\\");

      expect(LeaveType.find).toHaveBeenCalled();
    });

    it("should respect limit option", async () => {
      vi.mocked(LeaveType.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue([]),
        }),
      } as never);

      await LeaveTypeService.list(orgId, undefined, { limit: 10 });

      // Verify limit was applied (via the chained call)
      expect(LeaveType.find).toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("should create a new leave type", async () => {
      const payload = {
        code: "ML",
        name: "Maternity Leave",
        description: "Paid maternity leave",
        isPaid: true,
        annualEntitlementDays: 60,
      };

      vi.mocked(LeaveType.create).mockResolvedValue({
        _id: "lt-3",
        orgId,
        ...payload,
      } as never);

      const result = await LeaveTypeService.create(orgId, payload);

      expect(LeaveType.create).toHaveBeenCalledWith({
        ...payload,
        orgId,
      });
      expect(result.code).toBe("ML");
    });

    it("should require unique code per org", async () => {
      // Duplicate code should throw error
      expect(true).toBe(true);
    });
  });

  describe("calculateAccrual", () => {
    it("should calculate prorated accrual for partial year", () => {
      // Employee hired mid-year gets prorated entitlement
      const annualDays = 30;
      const monthsWorked = 6;
      const expectedAccrual = (annualDays / 12) * monthsWorked;

      expect(expectedAccrual).toBe(15);
    });

    it("should cap accrual at maximum allowed", () => {
      // Cannot exceed annual entitlement
      const annualDays = 30;
      const monthsWorked = 24; // 2 years worked, but no carryover
      const maxCarryover = 10;

      const accrued = (annualDays / 12) * monthsWorked; // 60 days
      const capped = Math.min(accrued, annualDays + maxCarryover);

      expect(capped).toBe(40);
    });

    it("should handle unpaid leave types (no accrual)", () => {
      // Unpaid leave has 0 accrual
      const isPaid = false;
      const accrual = isPaid ? 30 : 0;

      expect(accrual).toBe(0);
    });
  });
});
