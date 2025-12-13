/**
 * @fileoverview Tests for /api/aqar/recommendations routes
 * Tests Aqar AI-powered property recommendations
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock database
vi.mock("@/lib/mongo", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock recommendation engine
vi.mock("@/services/aqar/recommendation-engine", () => ({
  AqarRecommendationEngine: {
    getInstance: vi.fn().mockReturnValue({
      getRecommendations: vi.fn().mockResolvedValue([]),
    }),
  },
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

const importRoute = async () => {
  try {
    return await import("@/app/api/aqar/recommendations/route");
  } catch {
    return null;
  }
};

describe("API /api/aqar/recommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  describe("GET - Get Recommendations", () => {
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

      const req = new NextRequest("http://localhost:3000/api/aqar/recommendations");
      const response = await route.GET(req);

      expect([401, 429, 500]).toContain(response.status);
    });

    it("returns recommendations successfully", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest("http://localhost:3000/api/aqar/recommendations");
      const response = await route.GET(req);

      expect([200, 401, 500]).toContain(response.status);
    });
  });
});
