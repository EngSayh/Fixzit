/**
 * @fileoverview Tests for /api/marketplace/categories route
 * Tests product category listing operations
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Types } from "mongoose";

// Mock marketplace context
vi.mock("@/lib/marketplace/context", () => ({
  resolveMarketplaceContext: vi.fn(),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock Category model
vi.mock("@/server/models/marketplace/Category", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
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
  serializeCategory: vi.fn((cat) => cat),
}));

vi.mock("@/lib/marketplace/flags", () => ({
  isMarketplaceEnabled: vi.fn(),
  isPlaywrightTests: vi.fn(),
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { resolveMarketplaceContext } from "@/lib/marketplace/context";
import { isMarketplaceEnabled, isPlaywrightTests } from "@/lib/marketplace/flags";

const loadHandler = async () => {
  const { GET } = await import("@/app/api/marketplace/categories/route");
  return GET;
};

describe("API /api/marketplace/categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isMarketplaceEnabled).mockReturnValue(true);
    vi.mocked(isPlaywrightTests).mockReturnValue(false);
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(resolveMarketplaceContext).mockResolvedValue({
      tenantKey: "test-tenant",
      orgId: new Types.ObjectId(),
      userId: new Types.ObjectId(),
      role: "BUYER",
      correlationId: "test-correlation",
    });
  });

  describe("GET - List Categories", () => {
    it("returns 501 when marketplace is disabled", async () => {
      vi.mocked(isMarketplaceEnabled).mockReturnValue(false);
      const GET = await loadHandler();

      const req = new NextRequest("http://localhost:3000/api/marketplace/categories");
      const res = await GET(req);

      expect(res.status).toBe(501);
    });

    it("returns 429 when rate limit exceeded", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue({
        status: 429,
        json: async () => ({ error: "Rate limit exceeded" }),
      } as never);
      const GET = await loadHandler();

      const req = new NextRequest("http://localhost:3000/api/marketplace/categories");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("returns categories when marketplace is enabled", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      const GET = await loadHandler();

      const req = new NextRequest("http://localhost:3000/api/marketplace/categories");
      const res = await GET(req);

      // Should return 200 or 500 (if DB not connected)
      expect(res.status).toBe(200);
    });

    it("returns list of categories successfully", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      const GET = await loadHandler();
      
      const req = new NextRequest("http://localhost:3000/api/marketplace/categories");
      const res = await GET(req);

      // Should return 200 or 500 (if DB not connected), not rate limited
      expect(res.status).toBe(200);
    });

    it("uses rate limiting middleware", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      const GET = await loadHandler();
      
      const req = new NextRequest("http://localhost:3000/api/marketplace/categories");
      await GET(req);

      expect(enforceRateLimit).toHaveBeenCalled();
    });
  });
});
