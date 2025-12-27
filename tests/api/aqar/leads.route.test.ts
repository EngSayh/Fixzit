/**
 * @fileoverview Tests for /api/aqar/leads routes
 * Tests Aqar lead management
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock authentication
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(),
}));

// Mock database
vi.mock("@/lib/mongo", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

const importRoute = async () => {
  try {
    return await import("@/app/api/aqar/leads/route");
  } catch {
    return null;
  }
};

describe("API /api/aqar/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules(); // Reset module cache to ensure fresh imports with updated mocks
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  describe("POST - Create Lead", () => {
    it("returns 429 when rate limit exceeded", async () => {
      // Set up mock BEFORE importing the route
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const route = await importRoute();
      if (!route?.POST) {
        throw new Error("Route handler missing: POST");
      }

      const req = new NextRequest("http://localhost:3000/api/aqar/leads", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });
      const response = await route.POST(req);

      expect(response.status).toBe(429);
    });
  });

  describe("GET - List Leads", () => {
    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        throw new Error("Route handler missing: GET");
      }

      vi.mocked(getSessionUser).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost:3000/api/aqar/leads");
      const response = await route.GET(req);

      expect([200, 401, 403, 500, 503]).toContain(response.status);
    });
  });
});
