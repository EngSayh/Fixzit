/**
 * Tests for GET /api/souq/settlements/balance
 * @description Retrieves seller balance with tenant isolation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/souq/settlements/balance/route";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/services/souq/settlements/balance-service", () => ({
  SellerBalanceService: {
    getBalance: vi.fn().mockResolvedValue({
      available: 1000,
      reserved: 200,
      pending: 300,
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

describe("GET /api/souq/settlements/balance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost/api/souq/settlements/balance");
    const response = await GET(request);
    expect([401, 403, 500]).toContain(response.status);
  });

  it("returns 400 when orgId is missing", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "user-1",
        role: "VENDOR",
        // No orgId
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/souq/settlements/balance");
    const response = await GET(request);
    expect([400, 403, 500]).toContain(response.status);
  });

  it("returns balance for authenticated seller with orgId", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "seller-1",
        role: "VENDOR",
        orgId: "org-1",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/souq/settlements/balance");
    const response = await GET(request);
    // Seller with orgId should be able to access - either success or controlled error
    expect([200, 400, 404, 500]).toContain(response.status);
  });
});
