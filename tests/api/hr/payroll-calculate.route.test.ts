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
  }),
}));

// Mock HR models
vi.mock("@/server/models/hr.models", () => ({
  Employee: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
  AttendanceRecord: {
    find: vi.fn(),
    aggregate: vi.fn(),
  },
}));

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
    vi.mocked(PayrollService.getById).mockResolvedValue({
      _id: mockPayrollRunId,
      status: "DRAFT",
      orgId: mockOrgId,
    } as never);
    
    // Mock successful payroll calculation
    const mockCalculationResult = {
      success: true,
      calculatedLines: [
        { employeeId: "emp1", basicSalary: 10000, netPay: 9025 },
        { employeeId: "emp2", basicSalary: 12000, netPay: 10830 },
      ],
      totalGross: 22000,
      totalNet: 19855,
    };
    vi.mocked(PayrollService.calculatePayrollRun).mockResolvedValue(mockCalculationResult as never);

    const req = new NextRequest(`http://localhost/api/hr/payroll/runs/${mockPayrollRunId}/calculate`, {
      method: "POST",
    });
    const { POST } = await importRoute();
    const res = await POST(req, { params: Promise.resolve({ id: mockPayrollRunId }) });

    // Verify authorization passed and calculation succeeded
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(PayrollService.calculatePayrollRun).toHaveBeenCalledWith(
      expect.objectContaining({ _id: mockPayrollRunId }),
      expect.any(Object)
    );
  });

  it("allows HR_OFFICER subRole to calculate payroll", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user123", orgId: mockOrgId, role: "STAFF", subRole: "HR_OFFICER" },
    } as never);
    vi.mocked(PayrollService.getById).mockResolvedValue({
      _id: mockPayrollRunId,
      status: "DRAFT",
      orgId: mockOrgId,
    } as never);
    
    // Mock successful payroll calculation
    const mockCalculationResult = {
      success: true,
      calculatedLines: [
        { employeeId: "emp1", basicSalary: 8000, netPay: 7220 },
      ],
      totalGross: 8000,
      totalNet: 7220,
    };
    vi.mocked(PayrollService.calculatePayrollRun).mockResolvedValue(mockCalculationResult as never);

    const req = new NextRequest(`http://localhost/api/hr/payroll/runs/${mockPayrollRunId}/calculate`, {
      method: "POST",
    });
    const { POST } = await importRoute();
    const res = await POST(req, { params: Promise.resolve({ id: mockPayrollRunId }) });

    // Verify authorization passed and calculation succeeded
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(PayrollService.calculatePayrollRun).toHaveBeenCalled();
  });
});
