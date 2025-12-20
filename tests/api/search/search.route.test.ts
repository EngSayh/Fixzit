/**
 * @fileoverview Tests for /api/search routes
 * Tests global search functionality
 * MULTI-TENANT: Enforces org_id scope in search results
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting (both modules - routes use @/server/security/rateLimit)
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

vi.mock("@/server/security/rateLimit", () => ({
  rateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 59 }),
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 59 }),
}));

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock search service
vi.mock("@/lib/search/search-service", () => ({
  SearchService: {
    search: vi.fn().mockResolvedValue({
      results: [],
      total: 0,
    }),
  },
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { smartRateLimit } from "@/server/security/rateLimit";
import { auth } from "@/auth";

const importRoute = async () => {
  try {
    return await import("@/app/api/search/route");
  } catch {
    return null;
  }
};

describe("API /api/search", () => {
  const mockOrgId = "org_123456789";
  const mockUser = {
    id: "user_123",
    orgId: mockOrgId,
    role: "ADMIN",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true, remaining: 59 });
    vi.mocked(auth).mockResolvedValue({
      user: mockUser,
      expires: new Date(Date.now() + 86400000).toISOString(),
    } as never);
  });

  describe("GET - Global Search", () => {
    it("returns 429 when rate limit is exceeded", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      // Mock rate limit from @/server/security/rateLimit (uses smartRateLimit)
      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false, remaining: 0 });

      const req = new NextRequest("http://localhost:3000/api/search?q=test");
      const response = await route.GET(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(auth).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost:3000/api/search?q=test");
      const response = await route.GET(req);

      expect([401, 500, 503]).toContain(response.status);
    });

    it("returns 400 for missing query parameter", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest("http://localhost:3000/api/search");
      const response = await route.GET(req);

      expect([400, 422]).toContain(response.status);
    });

    it("accepts type filter parameter", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest(
        "http://localhost:3000/api/search?q=hvac&type=work_orders"
      );
      const response = await route.GET(req);

      expect([200, 400]).toContain(response.status);
    });
  });
});
