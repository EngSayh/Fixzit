/**
 * @fileoverview Tests for /api/hr/payroll/runs routes
 * Tests HR payroll run management including CRUD operations
 * 
 * Pattern: Mutable state pattern for mock isolation (per TESTING_STRATEGY.md)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { SessionUser } from "@/types/auth";

// Mutable state variables - controlled by beforeEach
let sessionUser: SessionUser | null = null;
let mockRateLimitResponse: Response | null = null;
let mockRoleAllowed = true;

// Mock rate limiting - uses mutable state
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

// Mock authentication - uses mutable state
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => {
    if (!sessionUser) return null;
    return { user: sessionUser };
  }),
}));

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock role guards - uses mutable state
vi.mock("@/lib/auth/role-guards", () => ({
  hasAllowedRole: vi.fn(() => mockRoleAllowed),
}));

// Mock PayrollService
vi.mock("@/server/services/hr/payroll.service", () => ({
  PayrollService: {
    list: vi.fn(),
    create: vi.fn(),
    existsOverlap: vi.fn(),
  },
}));

// Static imports AFTER vi.mock() declarations (mocks are hoisted)
import { PayrollService } from "@/server/services/hr/payroll.service";
import { auth } from "@/auth";
import { hasAllowedRole } from "@/lib/auth/role-guards";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// Dynamic import to ensure mocks are applied
const importRoute = async () => import("@/app/api/hr/payroll/runs/route");

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
    // Reset mutable state to defaults
    mockRateLimitResponse = null;
    mockRoleAllowed = true;
    sessionUser = mockUser;
    
    // Re-apply mock implementations after clearAllMocks
    vi.mocked(auth).mockImplementation(async () => {
      if (!sessionUser) return null;
      return { user: sessionUser, expires: new Date().toISOString() };
    });
    vi.mocked(hasAllowedRole).mockImplementation(() => mockRoleAllowed);
    vi.mocked(enforceRateLimit).mockImplementation(() => mockRateLimitResponse);
    
    // Setup PayrollService mocks
    vi.mocked(PayrollService.list).mockResolvedValue([]);
    vi.mocked(PayrollService.existsOverlap).mockResolvedValue(false);
    vi.mocked(PayrollService.create).mockResolvedValue({
      _id: "run_123",
      orgId: mockOrgId,
      name: "January 2025 Payroll",
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-01-31"),
      status: "DRAFT",
    });
  });

  describe("GET /api/hr/payroll/runs", () => {
    it("should return 401 when not authenticated", async () => {
      sessionUser = null;

      const { GET } = await importRoute();
      const request = new NextRequest("http://localhost/api/hr/payroll/runs");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 when user lacks HR role", async () => {
      sessionUser = { ...mockUser, role: "TEAM_MEMBER" };
      mockRoleAllowed = false;

      const { GET } = await importRoute();
      const request = new NextRequest("http://localhost/api/hr/payroll/runs");
      const response = await GET(request);
      expect(response.status).toBe(403);
    });

    it("should return payroll runs list for authorized HR user", async () => {
      vi.mocked(PayrollService.list).mockResolvedValue([
        {
          _id: "run_1",
          name: "January 2025 Payroll",
          status: "DRAFT",
          periodStart: new Date("2025-01-01"),
          periodEnd: new Date("2025-01-31"),
        },
      ]);

      const { GET } = await importRoute();
      const request = new NextRequest("http://localhost/api/hr/payroll/runs");
      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.runs).toHaveLength(1);
    });

    it("should filter by status when provided", async () => {
      const { GET } = await importRoute();
      const request = new NextRequest(
        "http://localhost/api/hr/payroll/runs?status=APPROVED"
      );
      await GET(request);
      expect(PayrollService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockOrgId,
          status: "APPROVED",
        })
      );
    });

    it("should accept SUPER_ADMIN role", async () => {
      sessionUser = { ...mockUser, role: "SUPER_ADMIN" };

      const { GET } = await importRoute();
      const request = new NextRequest("http://localhost/api/hr/payroll/runs");
      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/hr/payroll/runs", () => {
    it("should return 401 when not authenticated", async () => {
      sessionUser = null;

      const { POST } = await importRoute();
      const request = new NextRequest("http://localhost/api/hr/payroll/runs", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should return 400 for missing required fields", async () => {
      const { POST } = await importRoute();
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

      const { POST } = await importRoute();
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

      const { POST } = await importRoute();
      const request = new NextRequest("http://localhost/api/hr/payroll/runs", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      expect(response.status).toBe(429);
    });
  });
});
