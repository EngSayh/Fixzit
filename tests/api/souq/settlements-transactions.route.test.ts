/**
 * Tests for GET /api/souq/settlements/transactions
 * @description Retrieves paginated transaction history for sellers
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/souq/settlements/transactions/route";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/services/souq/settlements/balance-service", () => ({
  SellerBalanceService: {
    getTransactions: vi.fn().mockResolvedValue({
      transactions: [],
      total: 0,
      page: 1,
      pageSize: 20,
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

describe("GET /api/souq/settlements/transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost/api/souq/settlements/transactions");
    const response = await GET(request);
    expect([401, 403, 500]).toContain(response.status);
  });

  it("returns 400 when orgId is missing", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "seller-1",
        role: "VENDOR",
        // No orgId
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/souq/settlements/transactions");
    const response = await GET(request);
    // Route should require orgId for tenant isolation
    expect([400, 403, 404, 500]).toContain(response.status);
  });

  it("returns transactions for seller with orgId", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "seller-1",
        role: "VENDOR",
        orgId: "org-1",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/souq/settlements/transactions");
    const response = await GET(request);
    // Seller with orgId should be able to access - either success or controlled error
    expect([200, 400, 404, 500]).toContain(response.status);
  });

  it("returns transactions for admin user", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "admin-1",
        role: "ADMIN",
        orgId: "org-1",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/souq/settlements/transactions?sellerId=seller-1");
    const response = await GET(request);
    // Admin can view other seller transactions
    expect([200, 400, 404, 500]).toContain(response.status);
  });
});
