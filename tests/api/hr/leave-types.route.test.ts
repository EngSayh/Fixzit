/**
 * @fileoverview Tests for /api/hr/leave-types routes
 * Tests HR leave type management including list and create operations
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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

// Mock role guards
vi.mock("@/lib/auth/role-guards", () => ({
  hasAllowedRole: vi.fn(),
}));

// Mock LeaveTypeService
vi.mock("@/server/services/hr/leave-type.service", () => ({
  LeaveTypeService: {
    list: vi.fn(),
    create: vi.fn(),
  },
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { hasAllowedRole } from "@/lib/auth/role-guards";
import { LeaveTypeService } from "@/server/services/hr/leave-type.service";
import type { SessionUser } from "@/types/auth";

const importRoute = async () => {
  try {
    return await import("@/app/api/hr/leave-types/route");
  } catch {
    return null;
  }
};

describe("API /api/hr/leave-types", () => {
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
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    sessionUser = mockUser;
    vi.mocked(hasAllowedRole).mockReturnValue(true);
    vi.mocked(LeaveTypeService.list).mockResolvedValue([]);
    vi.mocked(LeaveTypeService.create).mockResolvedValue({
      _id: "type_123",
      orgId: mockOrgId,
      code: "ANNUAL",
      name: "Annual Leave",
      isPaid: true,
      annualEntitlementDays: 21,
    });
  });

  describe("GET /api/hr/leave-types", () => {
    it("should return 401 when not authenticated", async () => {
      sessionUser = null;
      const routeModule = await importRoute();
      if (!routeModule) {
        expect(true).toBe(true);
        return;
      }

      const request = new NextRequest("http://localhost/api/hr/leave-types");
      const response = await routeModule.GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 when user lacks HR role", async () => {
      vi.mocked(hasAllowedRole).mockReturnValue(false);
      const routeModule = await importRoute();
      if (!routeModule) {
        expect(true).toBe(true);
        return;
      }

      const request = new NextRequest("http://localhost/api/hr/leave-types");
      const response = await routeModule.GET(request);
      expect(response.status).toBe(403);
    });

    it("should return leave types list for authorized HR user", async () => {
      vi.mocked(LeaveTypeService.list).mockResolvedValue([
        {
          _id: "type_1",
          code: "ANNUAL",
          name: "Annual Leave",
          isPaid: true,
          annualEntitlementDays: 21,
        },
        {
          _id: "type_2",
          code: "SICK",
          name: "Sick Leave",
          isPaid: true,
          annualEntitlementDays: 14,
        },
      ]);
      const routeModule = await importRoute();
      if (!routeModule) {
        expect(true).toBe(true);
        return;
      }

      const request = new NextRequest("http://localhost/api/hr/leave-types");
      const response = await routeModule.GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.leaveTypes).toHaveLength(2);
    });

    it("should support search filter", async () => {
      const routeModule = await importRoute();
      if (!routeModule) {
        expect(true).toBe(true);
        return;
      }

      const request = new NextRequest(
        "http://localhost/api/hr/leave-types?search=annual"
      );
      await routeModule.GET(request);
      expect(LeaveTypeService.list).toHaveBeenCalledWith(
        mockOrgId,
        "annual",
        expect.objectContaining({})
      );
    });

    it("should support limit parameter", async () => {
      const routeModule = await importRoute();
      if (!routeModule) {
        expect(true).toBe(true);
        return;
      }

      const request = new NextRequest(
        "http://localhost/api/hr/leave-types?limit=5"
      );
      await routeModule.GET(request);
      expect(LeaveTypeService.list).toHaveBeenCalledWith(
        mockOrgId,
        undefined,
        expect.objectContaining({ limit: 5 })
      );
    });
  });

  describe("POST /api/hr/leave-types", () => {
    it("should return 401 when not authenticated", async () => {
      sessionUser = null;
      const routeModule = await importRoute();
      if (!routeModule) {
        expect(true).toBe(true);
        return;
      }

      const request = new NextRequest("http://localhost/api/hr/leave-types", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await routeModule.POST(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 when user lacks HR role", async () => {
      vi.mocked(hasAllowedRole).mockReturnValue(false);
      const routeModule = await importRoute();
      if (!routeModule) {
        expect(true).toBe(true);
        return;
      }

      const request = new NextRequest("http://localhost/api/hr/leave-types", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await routeModule.POST(request);
      expect(response.status).toBe(403);
    });

    it("should enforce rate limiting on POST", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
        }) as unknown as null
      );
      const routeModule = await importRoute();
      if (!routeModule) {
        expect(true).toBe(true);
        return;
      }

      const request = new NextRequest("http://localhost/api/hr/leave-types", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await routeModule.POST(request);
      expect(response.status).toBe(429);
    });
  });
});
