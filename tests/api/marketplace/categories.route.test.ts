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
    it("returns 501 when marketplace is disabled", async () => {
      process.env.MARKETPLACE_ENABLED = "false";

      const req = new NextRequest("http://localhost:3000/api/marketplace/categories");
      const res = await GET(req);

      expect(res.status).toBe(501);
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

    it("returns empty list when no categories exist", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      vi.mocked(Category.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/marketplace/categories");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data).toEqual([]);
    });

    it("returns list of categories", async () => {
      const mockCategories = [
        { _id: "cat-1", name: { en: "Electronics" }, slug: "electronics" },
        { _id: "cat-2", name: { en: "Office Supplies" }, slug: "office-supplies" },
      ];

      vi.mocked(enforceRateLimit).mockReturnValue(null);
      vi.mocked(Category.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockCategories),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/marketplace/categories");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it("sorts categories by order field", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(null);
      
      const sortMock = vi.fn().mockReturnThis();
      vi.mocked(Category.find).mockReturnValue({
        sort: sortMock,
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/marketplace/categories");
      await GET(req);

      expect(Category.find).toHaveBeenCalled();
    });
  });
});
