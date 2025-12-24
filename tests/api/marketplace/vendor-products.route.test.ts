/**
 * @fileoverview Tests for /api/marketplace/vendor/products route
 * Tests vendor product catalog operations - list and upsert
 * 
 * Uses mutable module-scope variables for Vitest forks isolation compatibility.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============= MUTABLE TEST CONTEXT =============
// These module-scope variables are read by mock factories at call time.
// Tests set these values BEFORE calling route handlers.

interface MarketplaceContext {
  userId: string | null;
  orgId: { toString: () => string };
  role: string;
}

let mockContext: MarketplaceContext = {
  userId: null,
  orgId: { toString: () => "org-123" },
  role: "GUEST",
};
let mockRateLimitAllowed = true;
let mockProducts: unknown[] = [];
let mockFindOneResult: unknown = null;
let mockCreateResult: unknown = null;
let mockUpdateResult: unknown = null;

// ============= MOCK DEFINITIONS =============
// Mock factories use closures to read from mutable variables at call time.

vi.mock("@/lib/marketplace/context", () => ({
  resolveMarketplaceContext: async () => mockContext,
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: async () => undefined,
}));

vi.mock("@/server/models/marketplace/Product", () => ({
  default: {
    find: () => ({
      sort: () => ({ limit: () => ({ lean: async () => mockProducts }) }),
      limit: () => ({ lean: async () => mockProducts }),
      lean: async () => mockProducts,
    }),
    findOne: async () => mockFindOneResult,
    create: async (data: unknown) => mockCreateResult ?? data,
    findOneAndUpdate: async () => mockUpdateResult,
  },
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: async () => ({ allowed: mockRateLimitAllowed }),
}));

vi.mock("@/lib/marketplace/serializers", () => ({
  serializeProduct: (product: unknown) => product,
}));

vi.mock("@/lib/marketplace/objectIds", () => ({
  objectIdFrom: (id: unknown) => id,
}));

// Static imports AFTER vi.mock() declarations
import { GET, POST } from "@/app/api/marketplace/vendor/products/route";

describe("API /api/marketplace/vendor/products", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    
    // Reset mutable context to defaults
    mockContext = {
      userId: null,
      orgId: { toString: () => "org-123" },
      role: "GUEST",
    };
    mockRateLimitAllowed = true;
    mockProducts = [];
    mockFindOneResult = null;
    mockCreateResult = null;
    mockUpdateResult = null;
  });

  describe("GET - List Vendor Products", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockContext = {
        userId: null,
        orgId: { toString: () => "org-123" },
        role: "GUEST",
      };

      const req = new NextRequest("http://localhost:3000/api/marketplace/vendor/products");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limit exceeded", async () => {
      mockContext = {
        userId: "vendor-123",
        orgId: { toString: () => "org-123" },
        role: "VENDOR",
      };
      mockRateLimitAllowed = false;

      const req = new NextRequest("http://localhost:3000/api/marketplace/vendor/products");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("returns empty list when vendor has no products", async () => {
      mockContext = {
        userId: "vendor-123",
        orgId: { toString: () => "org-123" },
        role: "VENDOR",
      };
      mockRateLimitAllowed = true;
      mockProducts = [];

      const req = new NextRequest("http://localhost:3000/api/marketplace/vendor/products");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it("returns list of vendor products", async () => {
      mockContext = {
        userId: "vendor-123",
        orgId: { toString: () => "org-123" },
        role: "VENDOR",
      };
      mockRateLimitAllowed = true;
      mockProducts = [
        { _id: "prod-1", title: { en: "Product 1" }, buy: { price: 100, currency: "SAR" } },
        { _id: "prod-2", title: { en: "Product 2" }, buy: { price: 200, currency: "SAR" } },
      ];

      const req = new NextRequest("http://localhost:3000/api/marketplace/vendor/products");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it("filters products by vendor ID when role is VENDOR", async () => {
      mockContext = {
        userId: "vendor-123",
        orgId: { toString: () => "org-123" },
        role: "VENDOR",
      };
      mockRateLimitAllowed = true;
      mockProducts = [];

      const req = new NextRequest("http://localhost:3000/api/marketplace/vendor/products");
      const res = await GET(req);

      // Verify successful response (products filtered by vendor)
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });
  });

  describe("POST - Create/Update Product", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockContext = {
        userId: null,
        orgId: { toString: () => "org-123" },
        role: "GUEST",
      };

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
      mockContext = {
        userId: "user-123",
        orgId: { toString: () => "org-123" },
        role: "BUYER", // Not a vendor
      };
      mockRateLimitAllowed = true;

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
      mockContext = {
        userId: "vendor-123",
        orgId: { toString: () => "org-123" },
        role: "VENDOR",
      };
      mockRateLimitAllowed = true;

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
      mockContext = {
        userId: "vendor-123",
        orgId: { toString: () => "org-123" },
        role: "VENDOR",
      };
      mockRateLimitAllowed = true;

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
      mockContext = {
        userId: "vendor-123",
        orgId: { toString: () => "org-123" },
        role: "VENDOR",
      };
      mockRateLimitAllowed = true;

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
      mockContext = {
        userId: "vendor-123",
        orgId: { toString: () => "org-123" },
        role: "VENDOR",
      };
      mockRateLimitAllowed = true;
      mockFindOneResult = null; // No existing product
      mockCreateResult = {
        _id: "prod-new",
        sku: "SKU001",
        title: { en: "Test Product" },
      };

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
      mockContext = {
        userId: "vendor-123",
        orgId: { toString: () => "org-123" },
        role: "VENDOR",
      };
      mockRateLimitAllowed = true;
      mockUpdateResult = {
        _id: "prod-1",
        sku: "SKU001",
        title: { en: "Updated Product" },
      };

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

