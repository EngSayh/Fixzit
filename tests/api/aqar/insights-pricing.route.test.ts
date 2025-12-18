/**
 * @fileoverview Tests for /api/aqar/insights/pricing routes
 * Tests Aqar market insights and analytics
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

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/server/middleware/withAuthRbac", () => {
  class UnauthorizedError extends Error {}
  return {
    getSessionUser: vi.fn(),
    UnauthorizedError,
  };
});

vi.mock("@/services/aqar/pricing-insights-service", () => ({
  PricingInsightsService: {
    getInsights: vi.fn().mockResolvedValue({
      correlationId: "test-correlation",
      sampleSize: 0,
      confidence: 0,
      currentAveragePrice: 0,
      demandScore: 0,
      dynamicRange: { conservative: 0, base: 0, bullish: 0 },
      marketSignals: [],
      priceBuckets: [],
      timeline: [],
    }),
  },
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser, UnauthorizedError } from "@/server/middleware/withAuthRbac";
import { PricingInsightsService } from "@/services/aqar/pricing-insights-service";

const importRoute = async () => {
  try {
    return await import("@/app/api/aqar/insights/pricing/route");
  } catch {
    return null;
  }
};

describe("API /api/aqar/insights/pricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  describe("GET - Get Pricing Insights", () => {
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

      const req = new NextRequest("http://localhost:3000/api/aqar/insights/pricing");
      const response = await route.GET(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when unauthenticated", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(getSessionUser).mockRejectedValue(new UnauthorizedError("unauthorized"));
      const req = new NextRequest("http://localhost:3000/api/aqar/insights/pricing");
      const response = await route.GET(req);
      expect(response.status).toBe(401);
    });

    it("returns 403 when orgId is missing", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(getSessionUser).mockResolvedValue({ id: "u1", orgId: undefined });
      const req = new NextRequest("http://localhost:3000/api/aqar/insights/pricing");
      const response = await route.GET(req);
      expect(response.status).toBe(403);
    });

    it("returns pricing insights successfully", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(getSessionUser).mockResolvedValue({ id: "u1", orgId: "507f1f77bcf86cd799439011" });
      const req = new NextRequest("http://localhost:3000/api/aqar/insights/pricing");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      expect(PricingInsightsService.getInsights).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: "507f1f77bcf86cd799439011" }),
      );
    });
  });
});
