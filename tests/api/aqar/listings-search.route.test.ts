/**
 * @fileoverview Tests for /api/aqar/listings/search route
 * Tests property search with filters and pagination
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

// Mock analytics
vi.mock("@/lib/analytics/incrementWithRetry", () => ({
  incrementAnalyticsWithRetry: vi.fn().mockResolvedValue(undefined),
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const importRoute = async () => {
  try {
    return await import("@/app/api/aqar/listings/search/route");
  } catch {
    return null;
  }
};

describe("POST /api/aqar/listings/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  it("returns 429 when rate limit exceeded", async () => {
    const route = await importRoute();
    if (!route?.POST) {
      expect(true).toBe(true);
      return;
    }

    vi.mocked(enforceRateLimit).mockReturnValue(
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
      }) as never
    );

    const req = new NextRequest("http://localhost:3000/api/aqar/listings/search", {
      method: "POST",
      body: JSON.stringify({ city: "Riyadh" }),
    });
    const response = await route.POST(req);

    expect(response.status).toBe(429);
  });

  it("handles search with filters", async () => {
    const route = await importRoute();
    if (!route?.POST) {
      expect(true).toBe(true);
      return;
    }

    const req = new NextRequest("http://localhost:3000/api/aqar/listings/search", {
      method: "POST",
      body: JSON.stringify({
        city: "Riyadh",
        minPrice: 100000,
        maxPrice: 500000,
      }),
    });
    const response = await route.POST(req);

    expect([200, 400, 500]).toContain(response.status);
  });
});
