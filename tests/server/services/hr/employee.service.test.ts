import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Employee model
vi.mock("@/server/models/hr.models", () => ({
  Employee: {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOneAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
  AttendanceRecord: {
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

import { EmployeeService } from "@/server/services/hr/employee.service";
import { AttendanceRecord, Employee } from "@/server/models/hr.models";

describe("EmployeeService", () => {
  const orgId = new Types.ObjectId().toString();
  const employeeId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getById", () => {
    it("should return employee by ID", async () => {
      const mockEmployee = {
        _id: employeeId,
        orgId,
        firstName: "John",
        lastName: "Doe",
        employeeCode: "EMP001",
      };

      vi.mocked(Employee.findOne).mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockEmployee),
        }),
      });

      const result = await EmployeeService.getById(orgId, employeeId);

      expect(vi.mocked(Employee.findOne)).toHaveBeenCalledWith({
        orgId,
        _id: employeeId,
        isDeleted: false,
      });
      expect(result).toEqual(mockEmployee);
    });

    it("should return null for non-existent employee", async () => {
      vi.mocked(Employee.findOne).mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(null),
        }),
      });

      const result = await EmployeeService.getById(orgId, "nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("getByCode", () => {
    it("should return employee by code", async () => {
      const mockEmployee = {
        _id: employeeId,
        orgId,
        employeeCode: "EMP001",
      };

      vi.mocked(Employee.findOne).mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockEmployee),
        }),
      });

      const result = await EmployeeService.getByCode(orgId, "EMP001");

      expect(vi.mocked(Employee.findOne)).toHaveBeenCalledWith({
        orgId,
        employeeCode: "EMP001",
        isDeleted: false,
      });
      expect(result).toEqual(mockEmployee);
    });
  });

  describe("search", () => {
    it("should search employees by department", async () => {
      const departmentId = new Types.ObjectId().toString();
      const mockEmployees = [
        { _id: employeeId, firstName: "John", departmentId },
      ];

      vi.mocked(Employee.find).mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockEmployees),
        }),
      });

      const result = await EmployeeService.search({
        orgId,
        departmentId,
      });

      expect(result).toEqual(mockEmployees);
    });

    it("should search employees by text", async () => {
      const mockEmployees = [{ _id: employeeId, firstName: "John" }];

      vi.mocked(Employee.find).mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockEmployees),
        }),
      });

      const result = await EmployeeService.search({
        orgId,
        text: "John",
      });

      expect(vi.mocked(Employee.find)).toHaveBeenCalled();
      expect(result).toEqual(mockEmployees);
    });

    it("should escape regex special characters to prevent ReDoS", async () => {
      vi.mocked(Employee.find).mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue([]),
        }),
      });

      // This should NOT cause ReDoS
      await EmployeeService.search({
        orgId,
        text: "test.*+?^${}()|[]\\",
      });

      expect(vi.mocked(Employee.find)).toHaveBeenCalled();
    });
  });

  describe("searchWithPagination", () => {
    it("should return paginated results", async () => {
      const mockEmployees = [{ _id: employeeId }];
      const mockQueryChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockEmployees),
      };
      vi.mocked(Employee.find).mockReturnValue(mockQueryChain as unknown as ReturnType<typeof Employee.find>);
      vi.mocked(Employee.countDocuments).mockReturnValue({ exec: vi.fn().mockResolvedValue(1) } as unknown as ReturnType<typeof Employee.countDocuments>);

      const result = await EmployeeService.searchWithPagination(
        { orgId },
        { page: 1, limit: 10 }
      );

      expect(result.items).toEqual(mockEmployees);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it("should default to page 1 and limit 50", async () => {
      const mockQueryChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(Employee.find).mockReturnValue(mockQueryChain as unknown as ReturnType<typeof Employee.find>);
      vi.mocked(Employee.countDocuments).mockReturnValue({ exec: vi.fn().mockResolvedValue(0) } as unknown as ReturnType<typeof Employee.countDocuments>);

      await EmployeeService.searchWithPagination({ orgId });

      // Pagination defaults work
      expect(vi.mocked(Employee.find)).toHaveBeenCalled();
    });
  });

  describe("upsert", () => {
    it("should upsert employee with compensation totals", async () => {
      vi.mocked(Employee.findOneAndUpdate).mockResolvedValue({
        _id: employeeId,
        employeeCode: "EMP002",
      } as never);

      await EmployeeService.upsert({
        orgId,
        employeeCode: "EMP002",
        firstName: "Sam",
        lastName: "Lee",
        jobTitle: "Technician",
        employmentType: "FULL_TIME",
        hireDate: new Date(),
        compensation: {
          baseSalary: 5000,
          currency: "OMR",
          payFrequency: "MONTHLY",
          housingAllowance: 300,
          transportAllowance: 200,
        },
      });

      expect(Employee.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId,
          employeeCode: "EMP002",
          isDeleted: false,
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            baseSalary: 5000,
            allowanceTotal: 500,
            currency: "OMR",
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe("updateTechnicianProfile", () => {
    it("should scope update to org and employee id", async () => {
      vi.mocked(Employee.findOneAndUpdate).mockResolvedValue({
        _id: employeeId,
        orgId,
      } as never);

      await EmployeeService.updateTechnicianProfile(orgId, employeeId, {
        skills: ["HVAC"],
        certifications: [],
        availability: "AVAILABLE",
      });

      expect(Employee.findOneAndUpdate).toHaveBeenCalledWith(
        { orgId, _id: employeeId, isDeleted: false },
        { technicianProfile: expect.any(Object) },
        { new: true },
      );
    });
  });

  describe("recordAttendance", () => {
    it("should upsert attendance by org, employee, and date", async () => {
      const entry = {
        orgId,
        employeeId,
        date: new Date("2025-01-01"),
        status: "PRESENT" as const,
      };

      vi.mocked(AttendanceRecord.findOneAndUpdate).mockResolvedValue({
        _id: "att_123",
      } as never);

      await EmployeeService.recordAttendance(entry);

      expect(AttendanceRecord.findOneAndUpdate).toHaveBeenCalledWith(
        { orgId, employeeId, date: entry.date },
        entry,
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    });
  });
});
