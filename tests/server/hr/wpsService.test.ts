import { describe, it, expect, beforeEach, vi } from "vitest";
import { Types } from "mongoose";
import type { PayrollLineDoc } from "@/server/models/hr.models";

const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

const attendanceRecordMock = vi.hoisted(() => ({
  find: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: loggerMock,
}));

vi.mock("@/server/models/hr.models", () => ({
  AttendanceRecord: attendanceRecordMock,
}));

import * as wpsService from "@/services/hr/wpsService";

function createPayrollLine(
  overrides: Partial<PayrollLineDoc> = {},
): PayrollLineDoc {
  const baseLine: Partial<PayrollLineDoc> = {
    employeeId: new Types.ObjectId(),
    employeeCode: "EMP-001",
    employeeName: "Test User",
    iban: "SA4420000001234567891234",
    baseSalary: 4000,
    housingAllowance: 1000,
    transportAllowance: 500,
    otherAllowances: [],
    allowances: 1500,
    overtimeHours: 0,
    overtimeAmount: 0,
    deductions: 0,
    taxDeduction: 0,
    gosiContribution: 0,
    netPay: 5500,
    currency: "SAR",
    notes: "",
    earnings: [],
    deductionLines: [],
    gosiBreakdown: {},
  };

  return { ...baseLine, ...overrides } as PayrollLineDoc;
}

function extractWorkDays(file: wpsService.WPSFile): number {
  const [, dataRow] = file.content.split("\n");
  const columns = dataRow.split(",");
  return Number(columns[10]);
}

describe("WPS work day calculation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    attendanceRecordMock.find.mockReset();
  });

  it("uses attendance-based calculation when workDays is not provided on the payroll line", async () => {
    const selectMock = vi.fn().mockResolvedValue([
      { date: new Date("2025-03-01T06:00:00Z") },
      { date: new Date("2025-03-02T06:00:00Z") },
      { date: new Date("2025-03-02T12:00:00Z") }, // duplicate day should not increase count
    ]);
    attendanceRecordMock.find.mockReturnValue({ select: selectMock } as any);

    const line = createPayrollLine();

    const { file, errors } = await wpsService.generateWPSFile(
      [line],
      "org-123",
      "2025-03",
    );

    expect(errors).toHaveLength(0);
    expect(attendanceRecordMock.find).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-123",
        employeeId: line.employeeId.toString(),
        isDeleted: false,
      }),
    );
    expect(extractWorkDays(file)).toBe(2);
  });

  it("falls back to calendar days and logs an error if attendance lookup fails", async () => {
    const line = createPayrollLine();
    const failure = new Error("attendance unavailable");
    const selectMock = vi.fn().mockRejectedValue(failure);

    attendanceRecordMock.find.mockReturnValue({ select: selectMock } as any);

    const { file } = await wpsService.generateWPSFile(
      [line],
      "org-123",
      "2025-02",
    );

    expect(loggerMock.error).toHaveBeenCalledWith(
      "[WPS] Failed to calculate work days from attendance",
      expect.objectContaining({
        employeeId: line.employeeId.toString(),
        orgId: "org-123",
        yearMonth: "2025-02",
        error: failure,
      }),
    );
    expect(extractWorkDays(file)).toBe(28); // February 2025 has 28 days
  });

  it("respects pre-computed workDays on the payroll line without hitting attendance lookups", async () => {
    const line = createPayrollLine();
    (line as any).workDays = 18;

    const { file } = await wpsService.generateWPSFile(
      [line],
      "org-123",
      "2025-03",
    );

    expect(attendanceRecordMock.find).not.toHaveBeenCalled();
    expect(extractWorkDays(file)).toBe(18);
  });
});
