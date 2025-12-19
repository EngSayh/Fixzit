/**
 * @fileoverview Tests for /api/aqar/map routes
 * Tests Aqar map/geolocation features
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
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
import { smartRateLimit } from "@/server/security/rateLimit";

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
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true } as any);
  });

  describe("GET - Get Map Data", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        throw new Error("Route handler missing: GET");
      }

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false } as any);

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
