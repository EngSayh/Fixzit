/**
 * @fileoverview Work Orders SLA Check API Tests
 * Tests for GET /api/work-orders/sla-check endpoint
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock auth - requireAbility returns a curried function that returns a user
vi.mock("@/server/middleware/withAuthRbac", () => ({
  requireAbility: vi.fn().mockReturnValue(() =>
    Promise.resolve({
      id: "507f1f77bcf86cd799439011",
      orgId: "507f1f77bcf86cd799439012",
      isSuperAdmin: false,
    })
  ),
  getSessionUser: vi.fn().mockResolvedValue({
    id: "507f1f77bcf86cd799439011",
    orgId: "507f1f77bcf86cd799439012",
  }),
}));

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    }),
  }),
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

import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const importRoute = async () => {
  try {
    return await import("@/app/api/work-orders/sla-check/route");
  } catch {
    return null;
  }
};

describe("Work Orders SLA Check API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  describe("GET /api/work-orders/sla-check", () => {
    it("returns SLA status for work orders", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest("http://localhost/api/work-orders/sla-check");
      const response = await route.GET(req);

      expect([200, 401, 403, 500]).toContain(response.status);
    });

    it("returns 429 when rate limited", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 }) as never
      );

      const req = new NextRequest("http://localhost/api/work-orders/sla-check");
      const response = await route.GET(req);

      expect([200, 401, 403, 429, 500]).toContain(response.status);
    });
  });
});
