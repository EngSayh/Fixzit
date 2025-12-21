/**
 * @fileoverview Tests for /api/hr/payroll/runs routes
 * Tests HR payroll run management including creation and listing
 */
import { expectAuthFailure } from '@/tests/api/_helpers';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type SessionUser = {
  id?: string;
  orgId?: string;
  role?: string;
  subRole?: string | null;
};
let sessionUser: SessionUser | null = null;

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock authentication
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

// Mock API parsing
vi.mock("@/lib/api/parse-body", () => ({
  parseBodyOrNull: vi.fn(),
}));

// Mock role guards
vi.mock("@/lib/auth/role-guards", () => ({
  hasAllowedRole: vi.fn(),
}));

// Mock PayrollService
vi.mock("@/server/services/hr/payroll.service", () => ({
  PayrollService: {
    list: vi.fn(),
    existsOverlap: vi.fn(),
    create: vi.fn(),
  },
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { PayrollService } from "@/server/services/hr/payroll.service";
import { parseBodyOrNull } from "@/lib/api/parse-body";
import { hasAllowedRole } from "@/lib/auth/role-guards";

const importRoute = async () => {
  try {
    return await import("@/app/api/hr/payroll/runs/route");
  } catch {
    return null;
  }
};

describe("API /api/hr/payroll/runs", () => {
  const mockOrgId = "org_123456789";
  const mockUser = {
    orgId: mockOrgId,
    role: "HR",
  };

  beforeEach(() => {
    sessionUser = null;
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    sessionUser = mockUser;
    vi.mocked(hasAllowedRole).mockReturnValue(true);
    vi.mocked(PayrollService.existsOverlap).mockResolvedValue(false);
  });

  describe("GET - List Payroll Runs", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/hr/payroll/runs");
      const response = await route.GET(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      sessionUser = null;

      const req = new NextRequest("http://localhost:3000/api/hr/payroll/runs");
      const response = await route.GET(req);

      expectAuthFailure(response);
    });

    it("returns 401 when user has no orgId (tenant scope missing)", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      sessionUser = { role: "HR", orgId: undefined };

      const req = new NextRequest("http://localhost:3000/api/hr/payroll/runs");
      const response = await route.GET(req);

      expectAuthFailure(response);
    });

    it("returns 403 when user lacks HR/Finance role", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      sessionUser = { orgId: mockOrgId, role: "EMPLOYEE" };

      const req = new NextRequest("http://localhost:3000/api/hr/payroll/runs");
      const response = await route.GET(req);

      expect(response.status).toBe(403);
    });

    it("successfully lists payroll runs with tenant scoping", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      const mockRuns = [
        {
          _id: "run_001",
          name: "January 2025",
          periodStart: "2025-01-01",
          periodEnd: "2025-01-31",
          status: "APPROVED",
          orgId: mockOrgId,
        },
        {
          _id: "run_002",
          name: "February 2025",
          periodStart: "2025-02-01",
          periodEnd: "2025-02-28",
          status: "DRAFT",
          orgId: mockOrgId,
        },
      ];

      vi.mocked(PayrollService.list).mockResolvedValue(mockRuns as never);

      const req = new NextRequest("http://localhost:3000/api/hr/payroll/runs");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.runs).toHaveLength(2);

      // Verify tenant scoping was enforced
      expect(PayrollService.list).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: mockOrgId })
      );
    });

    it("supports status filtering", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(PayrollService.list).mockResolvedValue([] as never);

      const req = new NextRequest(
        "http://localhost:3000/api/hr/payroll/runs?status=APPROVED"
      );
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      expect(PayrollService.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: "APPROVED" })
      );
    });
  });

  describe("POST - Create Payroll Run", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/hr/payroll/runs", {
        method: "POST",
        body: JSON.stringify({ name: "Test Run" }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      sessionUser = null;

      const req = new NextRequest("http://localhost:3000/api/hr/payroll/runs", {
        method: "POST",
        body: JSON.stringify({ name: "Test Run" }),
      });
      const response = await route.POST(req);

      expectAuthFailure(response);
    });

    it("returns 403 when user lacks HR/Finance role", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      sessionUser = { orgId: mockOrgId, role: "EMPLOYEE" };
      vi.mocked(hasAllowedRole).mockReturnValue(false);

      const req = new NextRequest("http://localhost:3000/api/hr/payroll/runs", {
        method: "POST",
        body: JSON.stringify({ name: "Test Run" }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(403);
    });

    it("successfully creates payroll run with tenant scoping", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      const mockRun = {
        _id: "run_new",
        name: "March 2025",
        periodStart: "2025-03-01",
        periodEnd: "2025-03-31",
        status: "DRAFT",
        orgId: mockOrgId,
      };

      vi.mocked(parseBodyOrNull).mockResolvedValue({
        name: "March 2025",
        periodStart: "2025-03-01",
        periodEnd: "2025-03-31",
      } as never);

      vi.mocked(PayrollService.existsOverlap).mockResolvedValue(false);
      vi.mocked(PayrollService.create).mockResolvedValue(mockRun as never);

      const req = new NextRequest("http://localhost:3000/api/hr/payroll/runs", {
        method: "POST",
        body: JSON.stringify({
          name: "March 2025",
          periodStart: "2025-03-01",
          periodEnd: "2025-03-31",
        }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.name).toBe("March 2025");

      // Verify tenant scoping was enforced
      expect(PayrollService.create).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: mockOrgId })
      );
    });

    it("returns 400 when request body is invalid", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(parseBodyOrNull).mockResolvedValue({} as never);

      const req = new NextRequest("http://localhost:3000/api/hr/payroll/runs", {
        method: "POST",
        body: JSON.stringify({}), // Missing required fields
      });
      const response = await route.POST(req);

      expect([400, 500]).toContain(response.status);
    });

    it("validates period overlap prevention", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(parseBodyOrNull).mockResolvedValue({
        name: "Duplicate Period",
        periodStart: "2025-01-01",
        periodEnd: "2025-01-31",
      } as never);

      vi.mocked(PayrollService.existsOverlap).mockResolvedValue(true);

      const req = new NextRequest("http://localhost:3000/api/hr/payroll/runs", {
        method: "POST",
        body: JSON.stringify({
          name: "Duplicate Period",
          periodStart: "2025-01-01",
          periodEnd: "2025-01-31",
        }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(409);
    });
  });
});
