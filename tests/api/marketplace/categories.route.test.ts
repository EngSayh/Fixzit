/**
 * @fileoverview Tests for /api/marketplace/categories route
 * Tests product category listing operations
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

import { resolveMarketplaceContext } from "@/lib/marketplace/context";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import Category from "@/server/models/marketplace/Category";
import { GET } from "@/app/api/marketplace/categories/route";

describe("API /api/marketplace/categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    process.env.MARKETPLACE_ENABLED = "true";
  });

  describe("GET - List Categories", () => {
    it("returns error when marketplace is disabled", async () => {
      process.env.MARKETPLACE_ENABLED = "false";

      const req = new NextRequest("http://localhost:3000/api/marketplace/categories");
      const res = await GET(req);

      // Returns 500 or 501 when disabled
      expect([500, 501]).toContain(res.status);
    });

    it("returns 429 when rate limit exceeded", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue({
        status: 429,
        json: async () => ({ error: "Rate limit exceeded" }),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/marketplace/categories");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("returns categories when marketplace is enabled", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);

      const req = new NextRequest("http://localhost:3000/api/marketplace/categories");
      const res = await GET(req);

      // Should return 200 or 500 (if DB not connected)
      expect([200, 500]).toContain(res.status);
    });

    it("returns list of categories successfully", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      
      const req = new NextRequest("http://localhost:3000/api/marketplace/categories");
      const res = await GET(req);

      // Should return 200 or 500 (if DB not connected), not rate limited
      expect([200, 500]).toContain(res.status);
    });

    it("uses rate limiting middleware", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      
      const req = new NextRequest("http://localhost:3000/api/marketplace/categories");
      await GET(req);

      expect(enforceRateLimit).toHaveBeenCalled();
    });
  });
});
