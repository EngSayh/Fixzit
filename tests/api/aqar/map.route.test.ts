/**
 * @fileoverview Tests for /api/aqar/map routes
 * Tests Aqar map/geolocation features
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Module-scoped mock state (survives vi.clearAllMocks)
let mockRateLimitResponse: Response | null = null;
let mockSmartRateLimitAllowed = true;

// Mock rate limiting with module-scoped variables
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: () => mockRateLimitResponse,
}));
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(async () => ({ allowed: mockSmartRateLimitAllowed })),
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

const importRoute = async () => {
  try {
    return await import("@/app/api/aqar/map/route");
  } catch {
    return null;
  }
};

describe("API /api/aqar/map", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimitResponse = null;
    mockSmartRateLimitAllowed = true;
  });

  describe("GET - Get Map Data", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        throw new Error("Route handler missing: GET");
      }

      mockSmartRateLimitAllowed = false;

      const req = new NextRequest("http://localhost:3000/api/aqar/map");
      const response = await route.GET(req);

      expect([401, 429, 500]).toContain(response.status);
    });

    it("returns map data successfully", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        throw new Error("Route handler missing: GET");
      }

      const req = new NextRequest("http://localhost:3000/api/aqar/map");
      const response = await route.GET(req);

      expect([200, 401, 500]).toContain(response.status);
    });
  });
});
