/**
 * @fileoverview Tests for /api/hr/payroll/runs/[id]/calculate route
 * Tests payroll calculation with KSA labor law compliance
 * HR TAG: Critical for salary calculations and GOSI deductions
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock role guards
vi.mock("@/lib/auth/role-guards", () => ({
  hasAllowedRole: vi.fn().mockReturnValue(true),
}));

// Mock PayrollService
vi.mock("@/server/services/hr/payroll.service", () => ({
  PayrollService: {
    getById: vi.fn(),
    calculatePayrollRun: vi.fn(),
    updateCalculation: vi.fn(),
  },
}));

// Mock KSA payroll service
vi.mock("@/services/hr/ksaPayrollService", () => ({
  calculateNetPay: vi.fn().mockReturnValue({
    basicSalary: 10000,
    housingAllowance: 2500,
    transportAllowance: 500,
    gosiEmployee: 975,
    gosiEmployer: 1175,
    netPay: 12025,
    totalDeductions: 975,
    earnings: [
      { code: "BASIC", amount: 10000 },
      { code: "HOUSING", amount: 2500 },
      { code: "TRANSPORT", amount: 500 },
      { code: "OVERTIME", amount: 0 },
    ],
    deductions: [],
    gosi: {
      employerContribution: 1175,
      breakdown: {},
    },
  }),
}));

// Mock HR models - need chainable mock for Mongoose queries
vi.mock("@/server/models/hr.models", () => {
  return {
    Employee: {
      find: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
      findOne: vi.fn(),
    },
    AttendanceRecord: {
      find: vi.fn(),
      aggregate: vi.fn().mockResolvedValue([]),
    },
  };
});

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { auth } from "@/auth";
import { hasAllowedRole } from "@/lib/auth/role-guards";
import { PayrollService } from "@/server/services/hr/payroll.service";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { Employee, AttendanceRecord } from "@/server/models/hr.models";

const importRoute = () => import("@/app/api/hr/payroll/runs/[id]/calculate/route");

describe("POST /api/hr/payroll/runs/[id]/calculate", () => {
  const mockOrgId = "507f1f77bcf86cd799439011";
  const mockPayrollRunId = "507f1f77bcf86cd799439012";
  const mockSession = {
    user: {
      id: "user123",
      orgId: mockOrgId,
      role: "HR",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(hasAllowedRole).mockReturnValue(true);
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const req = new NextRequest(`http://localhost/api/hr/payroll/runs/${mockPayrollRunId}/calculate`, {
      method: "POST",
    });
    const { POST } = await importRoute();
    const res = await POST(req, { params: Promise.resolve({ id: mockPayrollRunId }) });

    expect(res.status).toBe(401);
  });

  it("returns 401 when session has no orgId", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user123" } } as never);

    const req = new NextRequest(`http://localhost/api/hr/payroll/runs/${mockPayrollRunId}/calculate`, {
      method: "POST",
    });
    const { POST } = await importRoute();
    const res = await POST(req, { params: Promise.resolve({ id: mockPayrollRunId }) });

    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks HR role", async () => {
    vi.mocked(hasAllowedRole).mockReturnValue(false);

    const req = new NextRequest(`http://localhost/api/hr/payroll/runs/${mockPayrollRunId}/calculate`, {
      method: "POST",
    });
    const { POST } = await importRoute();
    const res = await POST(req, { params: Promise.resolve({ id: mockPayrollRunId }) });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("HR access required");
  });

  it("returns 404 when payroll run not found", async () => {
    vi.mocked(PayrollService.getById).mockResolvedValue(null as never);

    const req = new NextRequest(`http://localhost/api/hr/payroll/runs/${mockPayrollRunId}/calculate`, {
      method: "POST",
    });
    const { POST } = await importRoute();
    const res = await POST(req, { params: Promise.resolve({ id: mockPayrollRunId }) });

    expect(res.status).toBe(404);
  });

  it("returns 400 when payroll run is not DRAFT", async () => {
    vi.mocked(PayrollService.getById).mockResolvedValue({
      _id: mockPayrollRunId,
      status: "PROCESSING",
      orgId: mockOrgId,
    } as never);

    const req = new NextRequest(`http://localhost/api/hr/payroll/runs/${mockPayrollRunId}/calculate`, {
      method: "POST",
    });
    const { POST } = await importRoute();
    const res = await POST(req, { params: Promise.resolve({ id: mockPayrollRunId }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("DRAFT");
  });

  it("allows SUPER_ADMIN role to calculate payroll", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user123", orgId: mockOrgId, role: "SUPER_ADMIN" },
    } as never);
    
    // Mock payroll run with periodStart and periodEnd (required for aggregate query)
    vi.mocked(PayrollService.getById).mockResolvedValue({
      _id: mockPayrollRunId,
      status: "DRAFT",
      orgId: mockOrgId,
      periodStart: new Date("2024-01-01"),
      periodEnd: new Date("2024-01-31"),
    } as never);
    
    // Mock employees - must have active employees for calculation
    const mockEmployees = [
      { _id: "emp1", employeeCode: "E001", firstName: "John", lastName: "Doe", compensation: { baseSalary: 10000 }, bankDetails: {} },
      { _id: "emp2", employeeCode: "E002", firstName: "Jane", lastName: "Smith", compensation: { baseSalary: 12000 }, bankDetails: {} },
    ];
    vi.mocked(Employee.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockEmployees),
    } as never);
    
    // Mock attendance aggregate
    vi.mocked(AttendanceRecord.aggregate).mockResolvedValue([
      { _id: "emp1", totalMinutes: 120 },
      { _id: "emp2", totalMinutes: 60 },
    ] as never);
    
    // Mock successful payroll update
    const mockUpdatedRun = {
      _id: mockPayrollRunId,
      status: "IN_REVIEW",
      orgId: mockOrgId,
      totals: { grossPay: 22000, netPay: 19855 },
    };
    vi.mocked(PayrollService.updateCalculation).mockResolvedValue(mockUpdatedRun as never);

    const req = new NextRequest(`http://localhost/api/hr/payroll/runs/${mockPayrollRunId}/calculate`, {
      method: "POST",
    });
    const { POST } = await importRoute();
    const res = await POST(req, { params: Promise.resolve({ id: mockPayrollRunId }) });

    // Verify authorization passed and calculation succeeded
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.run).toBeDefined();
    expect(data.summary).toBeDefined();
    expect(PayrollService.updateCalculation).toHaveBeenCalled();
  });

  it("allows HR_OFFICER subRole to calculate payroll", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user123", orgId: mockOrgId, role: "STAFF", subRole: "HR_OFFICER" },
    } as never);
    
    // Mock payroll run with periodStart and periodEnd
    vi.mocked(PayrollService.getById).mockResolvedValue({
      _id: mockPayrollRunId,
      status: "DRAFT",
      orgId: mockOrgId,
      periodStart: new Date("2024-01-01"),
      periodEnd: new Date("2024-01-31"),
    } as never);
    
    // Mock employees - must have active employees for calculation
    const mockEmployees = [
      { _id: "emp1", employeeCode: "E001", firstName: "John", lastName: "Doe", compensation: { baseSalary: 8000 }, bankDetails: {} },
    ];
    vi.mocked(Employee.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockEmployees),
    } as never);
    
    // Mock attendance aggregate
    vi.mocked(AttendanceRecord.aggregate).mockResolvedValue([
      { _id: "emp1", totalMinutes: 90 },
    ] as never);
    
    // Mock successful payroll update
    const mockUpdatedRun = {
      _id: mockPayrollRunId,
      status: "IN_REVIEW",
      orgId: mockOrgId,
      totals: { grossPay: 8000, netPay: 7220 },
    };
    vi.mocked(PayrollService.updateCalculation).mockResolvedValue(mockUpdatedRun as never);

    const req = new NextRequest(`http://localhost/api/hr/payroll/runs/${mockPayrollRunId}/calculate`, {
      method: "POST",
    });
    const { POST } = await importRoute();
    const res = await POST(req, { params: Promise.resolve({ id: mockPayrollRunId }) });

    // Verify authorization passed and calculation succeeded
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.run).toBeDefined();
    expect(data.summary).toBeDefined();
    expect(PayrollService.updateCalculation).toHaveBeenCalled();
  });
});
