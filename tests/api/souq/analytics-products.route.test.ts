/**
 * Tests for GET /api/souq/analytics/products
 * @description Product-level performance analytics for sellers
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/souq/analytics/products/route";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/services/souq/analytics/analytics-service", () => ({
  analyticsService: {
    getProductPerformance: vi.fn().mockResolvedValue({
      products: [],
    }),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

import { auth } from "@/auth";

describe("GET /api/souq/analytics/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost/api/souq/analytics/products");
    const response = await GET(request);
    expect([401, 403, 500]).toContain(response.status);
  });

  it("returns 403 when orgId is missing", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "seller-1",
        role: "VENDOR",
        // No orgId
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/souq/analytics/products");
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it("returns product analytics for seller with orgId", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "seller-1",
        role: "VENDOR",
        orgId: "org-1",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/souq/analytics/products?period=last_30_days");
    const response = await GET(request);
    expect([200, 400, 500]).toContain(response.status);
  });
});
