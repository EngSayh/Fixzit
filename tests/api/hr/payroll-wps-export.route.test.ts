/**
 * @fileoverview Tests for /api/hr/payroll/runs/[id]/export/wps route
 * Tests WPS (Wage Protection System) file export for Saudi Arabia compliance
 * HR TAG: Critical for banking data and regulatory compliance
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
  },
}));

// Mock WPS service
vi.mock("@/services/hr/wpsService", () => ({
  generateWPSFile: vi.fn().mockResolvedValue({
    file: {
      content: "IBAN,Amount,Name\nSA0000000000000000000001,10000,Test Employee\n",
      checksum: "abc123def456",
      recordCount: 1,
      totalNetSalary: 10000,
      filename: "WPS_2025-02.csv",
    },
    errors: [],
  }),
  validateWPSFile: vi.fn().mockReturnValue({ isValid: true, errors: [], warnings: [] }),
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
import { generateWPSFile } from "@/services/hr/wpsService";

const importRoute = () => import("@/app/api/hr/payroll/runs/[id]/export/wps/route");

describe("GET /api/hr/payroll/runs/[id]/export/wps", () => {
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

    const req = new NextRequest(`http://localhost/api/hr/payroll/runs/${mockPayrollRunId}/export/wps`);
    const { GET } = await importRoute();
    const res = await GET(req, { params: Promise.resolve({ id: mockPayrollRunId }) });

    expect(res.status).toBe(401);
  });

  it("returns 401 when session has no orgId", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user123" } } as never);

    const req = new NextRequest(`http://localhost/api/hr/payroll/runs/${mockPayrollRunId}/export/wps`);
    const { GET } = await importRoute();
    const res = await GET(req, { params: Promise.resolve({ id: mockPayrollRunId }) });

    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks HR role", async () => {
    vi.mocked(hasAllowedRole).mockReturnValue(false);

    const req = new NextRequest(`http://localhost/api/hr/payroll/runs/${mockPayrollRunId}/export/wps`);
    const { GET } = await importRoute();
    const res = await GET(req, { params: Promise.resolve({ id: mockPayrollRunId }) });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("HR access required");
  });

  it("returns 404 when payroll run not found", async () => {
    vi.mocked(PayrollService.getById).mockResolvedValue(null as never);

    const req = new NextRequest(`http://localhost/api/hr/payroll/runs/${mockPayrollRunId}/export/wps`);
    const { GET } = await importRoute();
    const res = await GET(req, { params: Promise.resolve({ id: mockPayrollRunId }) });

    expect(res.status).toBe(404);
  });

  it("returns 400 when payroll run is DRAFT (not ready for export)", async () => {
    vi.mocked(PayrollService.getById).mockResolvedValue({
      _id: mockPayrollRunId,
      status: "DRAFT",
      orgId: mockOrgId,
    } as never);

    const req = new NextRequest(`http://localhost/api/hr/payroll/runs/${mockPayrollRunId}/export/wps`);
    const { GET } = await importRoute();
    const res = await GET(req, { params: Promise.resolve({ id: mockPayrollRunId }) });

    expect(res.status).toBe(400);
  });

  it("allows SUPER_ADMIN role to export WPS", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user123", orgId: mockOrgId, role: "SUPER_ADMIN" },
    } as never);
    const payrollRun = {
      _id: mockPayrollRunId,
      status: "APPROVED",
      orgId: mockOrgId,
      periodEnd: "2025-02-28T00:00:00.000Z",
      lines: [{ employeeId: "emp1", netPay: 10000 }],
    };
    vi.mocked(PayrollService.getById).mockResolvedValue({
      ...payrollRun,
    } as never);

    const req = new NextRequest(`http://localhost/api/hr/payroll/runs/${mockPayrollRunId}/export/wps`);
    const { GET } = await importRoute();
    const res = await GET(req, { params: Promise.resolve({ id: mockPayrollRunId }) });

    expect(res.status).toBe(200);
    const content = await res.text();
    expect(content).toContain("IBAN,Amount,Name");
    expect(res.headers.get("X-Record-Count")).toBe("1");
    expect(res.headers.get("X-File-Checksum")).toBe("abc123def456");
    expect(res.headers.get("X-Total-Net-Salary")).toBe("10000");
    expect(generateWPSFile).toHaveBeenCalledWith(
      payrollRun.lines,
      mockOrgId,
      "2025-02"
    );
  });

  it("allows HR_OFFICER subRole to export WPS", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user123", orgId: mockOrgId, role: "STAFF", subRole: "HR_OFFICER" },
    } as never);
    const payrollRun = {
      _id: mockPayrollRunId,
      status: "APPROVED",
      orgId: mockOrgId,
      periodEnd: "2025-02-28T00:00:00.000Z",
      lines: [{ employeeId: "emp1", netPay: 10000 }],
    };
    vi.mocked(PayrollService.getById).mockResolvedValue({
      ...payrollRun,
    } as never);

    const req = new NextRequest(`http://localhost/api/hr/payroll/runs/${mockPayrollRunId}/export/wps`);
    const { GET } = await importRoute();
    const res = await GET(req, { params: Promise.resolve({ id: mockPayrollRunId }) });

    expect(res.status).toBe(200);
    const content = await res.text();
    expect(content).toContain("IBAN,Amount,Name");
    expect(res.headers.get("X-Record-Count")).toBe("1");
    expect(generateWPSFile).toHaveBeenCalledWith(
      payrollRun.lines,
      mockOrgId,
      "2025-02"
    );
  });

  it("returns 403 when payroll run belongs to a different org", async () => {
    vi.mocked(PayrollService.getById).mockResolvedValue({
      _id: mockPayrollRunId,
      status: "APPROVED",
      orgId: "other-org",
      periodEnd: "2025-02-28T00:00:00.000Z",
      lines: [{ employeeId: "emp1", netPay: 10000 }],
    } as never);

    const req = new NextRequest(`http://localhost/api/hr/payroll/runs/${mockPayrollRunId}/export/wps`);
    const { GET } = await importRoute();
    const res = await GET(req, { params: Promise.resolve({ id: mockPayrollRunId }) });

    expect(res.status).toBe(403);
  });

  it("logs access denial for audit trail", async () => {
    vi.mocked(hasAllowedRole).mockReturnValue(false);
    const { logger } = await import("@/lib/logger");

    const req = new NextRequest(`http://localhost/api/hr/payroll/runs/${mockPayrollRunId}/export/wps`);
    const { GET } = await importRoute();
    await GET(req, { params: Promise.resolve({ id: mockPayrollRunId }) });

    expect(logger.warn).toHaveBeenCalledWith(
      "WPS export access denied",
      expect.objectContaining({
        userId: "user123",
        role: "HR",
      })
    );
  });
});
