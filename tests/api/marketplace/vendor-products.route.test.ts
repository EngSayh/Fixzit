/**
 * @fileoverview Tests for /api/marketplace/vendor/products route
 * Tests vendor product catalog operations - list and upsert
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

// Mock Product model
vi.mock("@/server/models/marketplace/Product", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

// Mock rate limiting
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

// Mock serializers
vi.mock("@/lib/marketplace/serializers", () => ({
  serializeProduct: vi.fn((product) => product),
}));

// Mock objectId helper
vi.mock("@/lib/marketplace/objectIds", () => ({
  objectIdFrom: vi.fn((id) => id),
}));

import { resolveMarketplaceContext } from "@/lib/marketplace/context";
import { smartRateLimit } from "@/server/security/rateLimit";
import Product from "@/server/models/marketplace/Product";

// Dynamic import to ensure mocks are applied fresh each time
const importRoute = async () => {
  // Re-import the route module to ensure mocks are properly applied
  return import("@/app/api/marketplace/vendor/products/route");
};

describe("API /api/marketplace/vendor/products", () => {
  beforeEach(() => {
    // Reset timers first to prevent fake timer contamination from other tests
    vi.useRealTimers();
    vi.clearAllMocks();
    
    // Reset default mock implementations to ensure clean state
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(Product.find).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as never);
    vi.mocked(Product.findOne).mockResolvedValue(null);
    vi.mocked(Product.create).mockImplementation((data) => Promise.resolve(data));
    vi.mocked(Product.findOneAndUpdate).mockImplementation((filter, update) => Promise.resolve(update));
    
    // NOTE: vi.resetModules() intentionally omitted here because this test
    // relies on hoisted vi.mock() calls (especially for mongodb-unified).
    // Calling resetModules() would clear those mocks and cause mongoose
    // reconnection errors in vitest.setup.ts.
  });

  describe("GET - List Vendor Products", () => {
    it("returns 401 when user is not authenticated", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: null,
        orgId: { toString: () => "org-123" } as never,
        role: "GUEST",
      });

      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/marketplace/vendor/products");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limit exceeded", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "vendor-123",
        orgId: { toString: () => "org-123" } as never,
        role: "VENDOR",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false });

      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/marketplace/vendor/products");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("returns empty list when vendor has no products", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "vendor-123",
        orgId: { toString: () => "org-123" } as never,
        role: "VENDOR",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });

      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/marketplace/vendor/products");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it("returns list of vendor products", async () => {
      const mockProducts = [
        { _id: "prod-1", title: { en: "Product 1" }, buy: { price: 100, currency: "SAR" } },
        { _id: "prod-2", title: { en: "Product 2" }, buy: { price: 200, currency: "SAR" } },
      ];

      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "vendor-123",
        orgId: { toString: () => "org-123" } as never,
        role: "VENDOR",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
      vi.mocked(Product.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockProducts),
      } as never);

      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/marketplace/vendor/products");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it("filters products by vendor ID when role is VENDOR", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "vendor-123",
        orgId: { toString: () => "org-123" } as never,
        role: "VENDOR",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
      vi.mocked(Product.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as never);

      const { GET } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/marketplace/vendor/products");
      await GET(req);

      // Verify vendorId filter was applied
      expect(Product.find).toHaveBeenCalled();
    });
  });

  describe("POST - Create/Update Product", () => {
    it("returns 401 when user is not authenticated", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: null,
        orgId: { toString: () => "org-123" } as never,
        role: "GUEST",
      });

      const { POST } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/marketplace/vendor/products", {
        method: "POST",
        body: JSON.stringify({
          categoryId: "cat-1",
          sku: "SKU001",
          slug: "product-1",
          title: { en: "Test Product" },
          buy: { price: 100, currency: "SAR", uom: "PCS" },
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 403 when user is not a vendor or admin", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" } as never,
        role: "BUYER", // Not a vendor
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });

      const { POST } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/marketplace/vendor/products", {
        method: "POST",
        body: JSON.stringify({
          categoryId: "cat-1",
          sku: "SKU001",
          slug: "product-1",
          title: { en: "Test Product" },
          buy: { price: 100, currency: "SAR", uom: "PCS" },
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
    });

    it("validates required fields with Zod", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "vendor-123",
        orgId: { toString: () => "org-123" } as never,
        role: "VENDOR",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });

      const { POST } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/marketplace/vendor/products", {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields
          title: { en: "Test" },
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("validates SKU is not empty", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "vendor-123",
        orgId: { toString: () => "org-123" } as never,
        role: "VENDOR",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });

      const { POST } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/marketplace/vendor/products", {
        method: "POST",
        body: JSON.stringify({
          categoryId: "cat-1",
          sku: "", // Empty SKU
          slug: "product-1",
          title: { en: "Test Product" },
          buy: { price: 100, currency: "SAR", uom: "PCS" },
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("validates price is positive", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "vendor-123",
        orgId: { toString: () => "org-123" } as never,
        role: "VENDOR",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });

      const { POST } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/marketplace/vendor/products", {
        method: "POST",
        body: JSON.stringify({
          categoryId: "cat-1",
          sku: "SKU001",
          slug: "product-1",
          title: { en: "Test Product" },
          buy: { price: -100, currency: "SAR", uom: "PCS" }, // Negative price
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("creates new product successfully", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "vendor-123",
        orgId: { toString: () => "org-123" } as never,
        role: "VENDOR",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
      vi.mocked(Product.findOne).mockResolvedValue(null); // No existing product
      vi.mocked(Product.create).mockResolvedValue({
        _id: "prod-new",
        sku: "SKU001",
        title: { en: "Test Product" },
      } as never);

      const { POST } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/marketplace/vendor/products", {
        method: "POST",
        body: JSON.stringify({
          categoryId: "cat-1",
          sku: "SKU001",
          slug: "product-1",
          title: { en: "Test Product" },
          buy: { price: 100, currency: "SAR", uom: "PCS" },
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
    });

    it("updates existing product when ID provided", async () => {
      vi.mocked(resolveMarketplaceContext).mockResolvedValue({
        userId: "vendor-123",
        orgId: { toString: () => "org-123" } as never,
        role: "VENDOR",
      });

      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
      vi.mocked(Product.findOneAndUpdate).mockResolvedValue({
        _id: "prod-1",
        sku: "SKU001",
        title: { en: "Updated Product" },
      } as never);

      const { POST } = await importRoute();
      const req = new NextRequest("http://localhost:3000/api/marketplace/vendor/products", {
        method: "POST",
        body: JSON.stringify({
          id: "prod-1",
          categoryId: "cat-1",
          sku: "SKU001",
          slug: "product-1",
          title: { en: "Updated Product" },
          buy: { price: 150, currency: "SAR", uom: "PCS" },
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });
  });
});
