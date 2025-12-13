/**
 * @fileoverview Tests for /api/marketplace/orders route
 * Tests order listing operations
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock marketplace context
const mockResolveMarketplaceContext = vi.fn();
vi.mock("@/lib/marketplace/context", () => ({
  resolveMarketplaceContext: (...args: unknown[]) => mockResolveMarketplaceContext(...args),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock Order model
const mockOrderFind = vi.fn();
vi.mock("@/server/models/marketplace/Order", () => ({
  default: {
    find: (...args: unknown[]) => mockOrderFind(...args),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

// Mock rate limiting
const mockEnforceRateLimit = vi.fn().mockReturnValue(null);
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

// Mock serializers
vi.mock("@/lib/marketplace/serializers", () => ({
  serializeOrder: vi.fn((order) => order),
}));

import { GET } from "@/app/api/marketplace/orders/route";

describe("API /api/marketplace/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
    mockResolveMarketplaceContext.mockResolvedValue({
      userId: "user-123",
      orgId: { toString: () => "org-123" },
      role: "BUYER",
    });
    mockOrderFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });
  });

  describe("GET - List Orders", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockResolveMarketplaceContext.mockResolvedValue({
        userId: null,
        orgId: { toString: () => "org-123" },
        role: "GUEST",
      });

      const req = new NextRequest("http://localhost:3000/api/marketplace/orders");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limit exceeded", async () => {
      mockEnforceRateLimit.mockReturnValue({
        status: 429,
        json: async () => ({ error: "Rate limit exceeded" }),
      });

      const req = new NextRequest("http://localhost:3000/api/marketplace/orders");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("uses rate limiting for order operations", async () => {
      const req = new NextRequest("http://localhost:3000/api/marketplace/orders");
      await GET(req);

      expect(mockEnforceRateLimit).toHaveBeenCalled();
    });
  });
});
