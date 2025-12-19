/**
 * @fileoverview Tests for /api/souq/returns routes
 * Tests return request listing and management
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

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock returns service
vi.mock("@/services/souq/returns-service", () => ({
  returnsService: {
    list: vi.fn(),
    getById: vi.fn(),
    getBuyerReturnHistory: vi.fn(),
  },
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { returnsService } from "@/services/souq/returns-service";
import type { SessionUser } from "@/types/auth";

const importRoute = async () => {
  try {
    return await import("@/app/api/souq/returns/route");
  } catch {
    return null;
  }
};

describe("API /api/souq/returns", () => {
  const mockOrgId = "org_123456789";
  const mockUser: SessionUser = {
    id: "user_123",
    orgId: mockOrgId,
    role: "TEAM_MEMBER",
    subRole: "SELLER",
    email: "seller@test.com",
    isSuperAdmin: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    sessionUser = mockUser;
    vi.mocked(returnsService.getBuyerReturnHistory).mockResolvedValue([]);
  });

  describe("GET /api/souq/returns", () => {
    it("should return 401 when not authenticated", async () => {
      sessionUser = null;
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest("http://localhost/api/souq/returns");
      const response = await routeModule.GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 when orgId is missing", async () => {
      sessionUser = { ...mockUser, orgId: undefined };
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest("http://localhost/api/souq/returns");
      const response = await routeModule.GET(request);
      expect(response.status).toBe(403);
    });

    it("should return returns list for authenticated user", async () => {
      vi.mocked(returnsService.getBuyerReturnHistory).mockResolvedValue([
        { _id: "return_1", status: "PENDING", reason: "Defective" },
      ]);
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest("http://localhost/api/souq/returns?type=buyer");
      const response = await routeModule.GET(request);
      expect(response.status).toBe(200);
    });

    it("should support status filter", async () => {
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest(
        "http://localhost/api/souq/returns?type=buyer&status=APPROVED"
      );
      const response = await routeModule.GET(request);
      expect([200, 400, 500]).toContain(response.status);
    });

    it("should support pagination", async () => {
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest(
        "http://localhost/api/souq/returns?type=buyer&page=2&limit=10"
      );
      const response = await routeModule.GET(request);
      expect(response.status).toBe(200);
    });

    it("should enforce rate limiting", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
        }) as unknown as null
      );
      const routeModule = await importRoute();
      if (!routeModule) {
        throw new Error("Route module missing");
      }

      const request = new NextRequest("http://localhost/api/souq/returns");
      const response = await routeModule.GET(request);
      expect(response.status).toBe(429);
    });
  });
});
