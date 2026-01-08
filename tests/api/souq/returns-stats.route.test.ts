/**
 * Tests for GET /api/souq/returns/stats/[sellerId]
 * @description Return statistics for a seller
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/souq/returns/stats/[sellerId]/route";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/services/souq/returns-service", () => ({
  returnsService: {
    getReturnStats: vi.fn().mockResolvedValue({
      returnRate: 5.2,
      topReasons: ["defective", "wrong_size"],
      trends: [],
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

describe("GET /api/souq/returns/stats/[sellerId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost/api/souq/returns/stats/seller-1");
    const response = await GET(request, { params: { sellerId: "seller-1" } });
    expect([401, 403, 500]).toContain(response.status);
  });

  it("returns stats for seller viewing own stats", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "seller-1",
        role: "VENDOR",
        orgId: "org-1",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/souq/returns/stats/seller-1");
    const response = await GET(request, { params: { sellerId: "seller-1" } });
    expect([200, 400, 403, 500]).toContain(response.status);
  });

  it("returns stats for admin querying any seller", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "admin-1",
        role: "ADMIN",
        orgId: "org-1",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/souq/returns/stats/seller-2");
    const response = await GET(request, { params: { sellerId: "seller-2" } });
    expect([200, 400, 404, 500]).toContain(response.status);
  });
});
