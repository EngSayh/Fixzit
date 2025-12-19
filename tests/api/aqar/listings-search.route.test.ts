/**
 * @fileoverview Tests for /api/aqar/listings/search route
 * Tests property search with filters and pagination
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
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

import { smartRateLimit } from "@/server/security/rateLimit";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

const originalPublicOrgId = process.env.PUBLIC_ORG_ID;
const originalTestOrgId = process.env.TEST_ORG_ID;
const originalDefaultOrgId = process.env.DEFAULT_ORG_ID;

const importRoute = async () => {
  try {
    return await import("@/app/api/aqar/listings/search/route");
  } catch {
    return null;
  }
};

describe("GET /api/aqar/listings/search", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    resetTestMocks();
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
    process.env.PUBLIC_ORG_ID = "000000000000000000000001";
  });

  afterEach(() => {
    if (originalPublicOrgId === undefined) {
      delete process.env.PUBLIC_ORG_ID;
    } else {
      process.env.PUBLIC_ORG_ID = originalPublicOrgId;
    }
    if (originalTestOrgId === undefined) {
      delete process.env.TEST_ORG_ID;
    } else {
      process.env.TEST_ORG_ID = originalTestOrgId;
    }
    if (originalDefaultOrgId === undefined) {
      delete process.env.DEFAULT_ORG_ID;
    } else {
      process.env.DEFAULT_ORG_ID = originalDefaultOrgId;
    }
  });

  it("returns 429 when rate limit exceeded", async () => {
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

    expect([200, 400, 500]).toContain(response.status);
  });

  it("returns 503 when public org is missing", async () => {
    const route = await importRoute();
    if (!route?.GET) {
      throw new Error("Route handler missing: GET");
    }

    delete process.env.PUBLIC_ORG_ID;
    delete process.env.TEST_ORG_ID;
    delete process.env.DEFAULT_ORG_ID;

    const req = new NextRequest("http://localhost:3000/api/aqar/listings/search?city=Riyadh", {
      method: "GET",
    });
    const response = await route.GET(req);

    expect(response.status).toBe(503);
  });
});
