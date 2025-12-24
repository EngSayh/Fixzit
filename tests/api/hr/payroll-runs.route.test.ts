/**
 * @fileoverview Tests for /api/hr/payroll/runs routes
 * Tests HR payroll run management including CRUD operations
 * 
 * Uses mutable module-scope variables for Vitest forks isolation compatibility.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { SessionUser } from "@/types/auth";

// ============= MUTABLE TEST CONTEXT =============
// These module-scope variables are read by mock factories at call time.
// Tests set these values BEFORE calling route handlers.

let sessionUser: SessionUser | null = null;
let mockRateLimitResponse: Response | null = null;
let mockRoleAllowed = true;
let mockPayrollRuns: unknown[] = [];
let mockPayrollCreateResult: unknown = null;
let mockExistsOverlap = false;
let mockListCalledWith: unknown = null;

// ============= MOCK DEFINITIONS =============
// Mock factories read from mutable variables via closures.

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => {
    if (!sessionUser) return null;
    return { user: sessionUser, expires: new Date().toISOString() };
  }),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/auth/role-guards", () => ({
  hasAllowedRole: vi.fn(() => mockRoleAllowed),
}));

vi.mock("@/server/services/hr/payroll.service", () => ({
  PayrollService: {
    list: async (params: unknown) => {
      mockListCalledWith = params;
      return mockPayrollRuns;
    },
    create: async () => mockPayrollCreateResult,
    existsOverlap: async () => mockExistsOverlap,
  },
}));

// Static imports AFTER vi.mock() declarations
import { GET, POST } from "@/app/api/hr/payroll/runs/route";

describe("API /api/hr/payroll/runs", () => {
  const mockOrgId = "org_123456789";
  const mockUser: SessionUser = {
    id: "user_123",
    orgId: mockOrgId,
    role: "HR",
    subRole: null,
    email: "hr@test.com",
    isSuperAdmin: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mutable context to defaults
    mockRateLimitResponse = null;
    mockRoleAllowed = true;
    sessionUser = mockUser;
    mockPayrollRuns = [];
    mockExistsOverlap = false;
    mockListCalledWith = null;
    mockPayrollCreateResult = {
      _id: "run_123",
      orgId: mockOrgId,
      name: "January 2025 Payroll",
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-01-31"),
      status: "DRAFT",
    };
  });

  describe("GET /api/hr/payroll/runs", () => {
    it("should return 401 when not authenticated", async () => {
      sessionUser = null;

      const request = new NextRequest("http://localhost/api/hr/payroll/runs");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 when user lacks HR role", async () => {
      sessionUser = { ...mockUser, role: "TEAM_MEMBER" };
      mockRoleAllowed = false;

      const request = new NextRequest("http://localhost/api/hr/payroll/runs");
      const response = await GET(request);
      expect(response.status).toBe(403);
    });

    it("should return payroll runs list for authorized HR user", async () => {
      mockPayrollRuns = [
        {
          _id: "run_1",
          name: "January 2025 Payroll",
          status: "DRAFT",
          periodStart: new Date("2025-01-01"),
          periodEnd: new Date("2025-01-31"),
        },
      ];

      const request = new NextRequest("http://localhost/api/hr/payroll/runs");
      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.runs).toHaveLength(1);
    });

    it("should filter by status when provided", async () => {
      const request = new NextRequest(
        "http://localhost/api/hr/payroll/runs?status=APPROVED"
      );
      await GET(request);
      expect(mockListCalledWith).toMatchObject({
        orgId: mockOrgId,
        status: "APPROVED",
      });
    });

    it("should accept SUPER_ADMIN role", async () => {
      sessionUser = { ...mockUser, role: "SUPER_ADMIN" };

      const request = new NextRequest("http://localhost/api/hr/payroll/runs");
      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/hr/payroll/runs", () => {
    it("should return 401 when not authenticated", async () => {
      sessionUser = null;

      const request = new NextRequest("http://localhost/api/hr/payroll/runs", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should return 400 for missing required fields", async () => {
      const request = new NextRequest("http://localhost/api/hr/payroll/runs", {
        method: "POST",
        body: JSON.stringify({ name: "Test Run" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should create payroll run with valid data", async () => {
      const validData = {
        name: "January 2025 Payroll",
        periodStart: "2025-01-01",
        periodEnd: "2025-01-31",
      };

      const request = new NextRequest("http://localhost/api/hr/payroll/runs", {
        method: "POST",
        body: JSON.stringify(validData),
        headers: { "Content-Type": "application/json" },
      });
      const response = await POST(request);
      expect(response.status).toBe(201);
    });

    it("should enforce rate limiting on POST", async () => {
      mockRateLimitResponse = new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
      });

      const request = new NextRequest("http://localhost/api/hr/payroll/runs", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      expect(response.status).toBe(429);
    });
  });
});
