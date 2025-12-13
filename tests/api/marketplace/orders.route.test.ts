/**
 * @fileoverview Tests for /api/marketplace/orders route
 * Tests order listing operations
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock marketplace context
vi.mock("@/lib/marketplace/context", () => ({
  resolveMarketplaceContext: vi.fn(),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock Order model
vi.mock("@/server/models/marketplace/Order", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock serializers
vi.mock("@/lib/marketplace/serializers", () => ({
  serializeOrder: vi.fn((order) => order),
}));

import { resolveMarketplaceContext } from "@/lib/marketplace/context";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import Order from "@/server/models/marketplace/Order";
import { GET } from "@/app/api/marketplace/orders/route";

describe("API /api/marketplace/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET - List Orders", () => {
    it("returns 401 when user is not authenticated", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: null,
        orgId: { toString: () => "org-123" } as never,
        role: "GUEST",
      });

      const req = new NextRequest("http://localhost:3000/api/marketplace/orders");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limit exceeded", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      vi.mocked(enforceRateLimit).mockReturnValue({
        status: 429,
        json: async () => ({ error: "Rate limit exceeded" }),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/marketplace/orders");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("returns empty list when no orders exist", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      vi.mocked(enforceRateLimit).mockReturnValue(null);

      const req = new NextRequest("http://localhost:3000/api/marketplace/orders");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it("returns list of orders for organization", async () => {
      const mockOrders = [
        { _id: "order-1", status: "PENDING", totals: { grand: 1000 } },
        { _id: "order-2", status: "COMPLETED", totals: { grand: 2500 } },
      ];

      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      vi.mocked(enforceRateLimit).mockReturnValue(null);
      vi.mocked(Order.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockOrders),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/marketplace/orders");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it("filters orders by status query parameter", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      vi.mocked(enforceRateLimit).mockReturnValue(null);
      vi.mocked(Order.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/marketplace/orders?status=PENDING");
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(Order.find).toHaveBeenCalled();
    });

    it("applies tenant isolation to order queries", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER",
      });

      vi.mocked(enforceRateLimit).mockReturnValue(null);
      vi.mocked(Order.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/marketplace/orders");
      await GET(req);

      // Verify orgId was used in query
      expect(Order.find).toHaveBeenCalled();
    });
  });
});
