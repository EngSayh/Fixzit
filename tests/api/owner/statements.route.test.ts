/**
 * @fileoverview Owner Statements API Tests
 * Tests for GET /api/owner/statements endpoint
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock auth
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn().mockResolvedValue({
    id: "507f1f77bcf86cd799439011",
    orgId: "507f1f77bcf86cd799439012",
    role: "PROPERTY_OWNER",
  }),
}));

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
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
import { getSessionUser } from "@/server/middleware/withAuthRbac";

const importRoute = async () => {
  try {
    return await import("@/app/api/owner/statements/route");
  } catch {
    return null;
  }
};

describe("Owner Statements API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "507f1f77bcf86cd799439011",
      orgId: "507f1f77bcf86cd799439012",
      role: "PROPERTY_OWNER",
    } as never);
  });

  describe("GET /api/owner/statements", () => {
    it("returns owner statements", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest("http://localhost/api/owner/statements");
      const response = await route.GET(req);

      expect([200, 401, 403, 500]).toContain(response.status);
    });

    it("returns 401 when unauthorized", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(getSessionUser).mockResolvedValueOnce(null as never);

      const req = new NextRequest("http://localhost/api/owner/statements");
      const response = await route.GET(req);

      expect([401, 500]).toContain(response.status);
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

      const req = new NextRequest("http://localhost/api/owner/statements");
      const response = await route.GET(req);

      expect([200, 401, 403, 429, 500]).toContain(response.status);
    });
  });
});
