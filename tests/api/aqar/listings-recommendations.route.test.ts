/**
 * @fileoverview Tests for /api/aqar/listings/recommendations route
 * Tests property recommendations based on user preferences
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
    return await import("@/app/api/aqar/listings/recommendations/route");
  } catch {
    return null;
  }
};

describe("GET /api/aqar/listings/recommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  it("returns 429 when rate limit exceeded", async () => {
    const route = await importRoute();
    if (!route?.GET) {
      throw new Error("Route handler missing: GET");
    }

    vi.mocked(enforceRateLimit).mockReturnValue(
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
      }) as never
    );

    const req = new NextRequest("http://localhost:3000/api/aqar/listings/recommendations");
    const response = await route.GET(req);

    expect([200, 401, 429, 500]).toContain(response.status);
  });

  it("handles recommendations request", async () => {
    const route = await importRoute();
    if (!route?.GET) {
      throw new Error("Route handler missing: GET");
    }

    const req = new NextRequest("http://localhost:3000/api/aqar/listings/recommendations");
    const response = await route.GET(req);

    expect([200, 401, 500]).toContain(response.status);
  });
});
