/**
 * @fileoverview Tests for /api/aqar/listings/search route
 * Tests property search with filters and pagination
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

// Mock database (route uses @/lib/mongodb-unified)
vi.mock("@/lib/mongodb-unified", () => ({
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

// Mock analytics
vi.mock("@/lib/analytics/incrementWithRetry", () => ({
  incrementAnalyticsWithRetry: vi.fn().mockResolvedValue(undefined),
}));

import { smartRateLimit } from "@/server/security/rateLimit";

// Dynamic import to ensure fresh module per test (prevents CI shard mock contamination)
const importRoute = async () => {
  try {
    return await import("@/app/api/aqar/listings/search/route");
  } catch {
    return null;
  }
};

describe("GET /api/aqar/listings/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules(); // Reset module cache to ensure fresh imports with updated mocks
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
  });

  it("returns 429 when rate limit exceeded", async () => {
    // Set up mock BEFORE importing the route
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false });

    const route = await importRoute();
    if (!route?.GET) {
      throw new Error("Route handler missing: GET");
    }

    const req = new NextRequest("http://localhost:3000/api/aqar/listings/search?city=Riyadh", {
      method: "GET",
    });
    const response = await route.GET(req);

    expect(response.status).toBe(429);
  });

  it("handles search with filters", async () => {
    const route = await importRoute();
    if (!route?.GET) {
      throw new Error("Route handler missing: GET");
    }

    const req = new NextRequest("http://localhost:3000/api/aqar/listings/search?city=Riyadh&minPrice=100000&maxPrice=500000", {
      method: "GET",
    });
    const response = await route.GET(req);

    // Route returns 200 with results array (possibly empty) on success
    expect(response.status).toBe(200);
  });
});
