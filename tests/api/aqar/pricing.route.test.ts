/**
 * @fileoverview Tests for /api/aqar/pricing routes
 * Tests Aqar pricing/valuation features
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting (route uses smartRateLimit from @/server/security/rateLimit)
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

// Mock database (route uses @/lib/mongodb-unified)
vi.mock("@/lib/mongodb-unified", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

// Mock PricingInsightsService
vi.mock("@/services/aqar/pricing-insights-service", () => ({
  PricingInsightsService: {
    getInsights: vi.fn().mockResolvedValue({
      averagePrice: 500000,
      priceRange: { min: 400000, max: 600000 },
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

import { smartRateLimit } from "@/server/security/rateLimit";

const importRoute = async () => {
  try {
    return await import("@/app/api/aqar/pricing/route");
  } catch {
    return null;
  }
};

describe("API /api/aqar/pricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
  });

  describe("GET - Get Pricing Data", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        throw new Error("Route handler missing: GET");
      }

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false });

      const req = new NextRequest("http://localhost:3000/api/aqar/pricing?city=Riyadh");
      const response = await route.GET(req);

      expect(response.status).toBe(429);
    });

    it("returns pricing data successfully", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        throw new Error("Route handler missing: GET");
      }

      const req = new NextRequest("http://localhost:3000/api/aqar/pricing?city=Riyadh");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
    });
  });
});
