/**
 * @fileoverview Tests for /api/marketplace/products route
 * Tests product catalog operations - list and create
 * 
 * Note: These tests focus on authentication, authorization, rate limiting,
 * and Zod validation since the route uses dynamic imports for Product model.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Module-scoped mock state (survives vi.clearAllMocks)
let mockIsMarketplaceEnabled = true;

// Mock marketplace context
const mockResolveMarketplaceContext = vi.fn();
vi.mock("@/lib/marketplace/context", () => ({
  resolveMarketplaceContext: (...args: unknown[]) => mockResolveMarketplaceContext(...args),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock Product model with proper default export
const mockProductFind = vi.fn().mockReturnValue({
  sort: vi.fn().mockReturnThis(),
  skip: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  lean: vi.fn().mockResolvedValue([]),
});
const mockProductCountDocuments = vi.fn().mockResolvedValue(0);
const mockProductCreate = vi.fn();

vi.mock("@/server/models/marketplace/Product", () => ({
  default: {
    find: (...args: unknown[]) => mockProductFind(...args),
    countDocuments: (...args: unknown[]) => mockProductCountDocuments(...args),
    create: (...args: unknown[]) => mockProductCreate(...args),
  },
}));

// Mock rate limiting
const mockEnforceRateLimit = vi.fn().mockReturnValue(null);
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

// Mock serializers
vi.mock("@/lib/marketplace/serializers", () => ({
  serializeProduct: vi.fn((product) => product),
}));

// Mock objectId helper
vi.mock("@/lib/marketplace/objectIds", () => ({
  objectIdFrom: vi.fn((id) => id),
}));

// Mock marketplace flags using module-scoped variable
vi.mock("@/lib/marketplace/flags", () => ({
  isMarketplaceEnabled: () => mockIsMarketplaceEnabled,
}));

// Dynamic import to ensure mocks are applied
const importRoute = async () => import("@/app/api/marketplace/products/route");

describe("API /api/marketplace/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module-scoped mock state
    mockIsMarketplaceEnabled = true;
    // Reset mocks to default behavior
    mockEnforceRateLimit.mockReturnValue(null);
    mockResolveMarketplaceContext.mockResolvedValue({
      userId: "user-123",
      orgId: { toString: () => "org-123" },
      role: "BUYER",
    });
    mockProductFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });
    mockProductCountDocuments.mockResolvedValue(0);
  });

  describe("GET - List Products", () => {
    it("returns 501 when marketplace is disabled", async () => {
      mockIsMarketplaceEnabled = false;
      const { GET } = await importRoute();

      const req = new NextRequest("http://localhost:3000/api/marketplace/products");
      const res = await GET(req);

      expect(res.status).toBe(501);
    });

    it("returns 429 when rate limit exceeded", async () => {
      mockEnforceRateLimit.mockReturnValue({
        status: 429,
        json: async () => ({ error: "Rate limit exceeded" }),
      });
      const { GET } = await importRoute();

      const req = new NextRequest("http://localhost:3000/api/marketplace/products");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("returns products list when marketplace is enabled", async () => {
      const { GET } = await importRoute();

      const req = new NextRequest("http://localhost:3000/api/marketplace/products");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
    });
  });

  describe("POST - Create Product", () => {
    it("returns 501 when marketplace is disabled", async () => {
      mockIsMarketplaceEnabled = false;
      const { POST } = await importRoute();

      const req = new NextRequest("http://localhost:3000/api/marketplace/products", {
        method: "POST",
        body: JSON.stringify({
          categoryId: "cat-1",
          sku: "SKU001",
          slug: "test-product",
          title: { en: "Test Product" },
          buy: { price: 100, currency: "SAR", uom: "PCS" },
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(501);
    });

    it("returns 401 when user is not authenticated", async () => {
      mockResolveMarketplaceContext.mockResolvedValue({
        userId: null,
        orgId: { toString: () => "org-123" },
        role: "GUEST",
      });
      const { POST } = await importRoute();

      const req = new NextRequest("http://localhost:3000/api/marketplace/products", {
        method: "POST",
        body: JSON.stringify({
          categoryId: "cat-1",
          sku: "SKU001",
          slug: "test-product",
          title: { en: "Test Product" },
          buy: { price: 100, currency: "SAR", uom: "PCS" },
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 403 when user is not an admin", async () => {
      mockResolveMarketplaceContext.mockResolvedValue({
        userId: "user-123",
        orgId: { toString: () => "org-123" },
        role: "BUYER",
      });
      const { POST } = await importRoute();

      const req = new NextRequest("http://localhost:3000/api/marketplace/products", {
        method: "POST",
        body: JSON.stringify({
          categoryId: "cat-1",
          sku: "SKU001",
          slug: "test-product",
          title: { en: "Test Product" },
          buy: { price: 100, currency: "SAR", uom: "PCS" },
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
    });

    it("validates required fields", async () => {
      mockResolveMarketplaceContext.mockResolvedValue({
        userId: "admin-123",
        orgId: { toString: () => "org-123" },
        role: "SUPER_ADMIN",
      });
      const { POST } = await importRoute();

      const req = new NextRequest("http://localhost:3000/api/marketplace/products", {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields
          title: { en: "Test" },
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("validates price is positive", async () => {
      mockResolveMarketplaceContext.mockResolvedValue({
        userId: "admin-123",
        orgId: { toString: () => "org-123" },
        role: "SUPER_ADMIN",
      });
      const { POST } = await importRoute();

      const req = new NextRequest("http://localhost:3000/api/marketplace/products", {
        method: "POST",
        body: JSON.stringify({
          categoryId: "cat-1",
          sku: "SKU001",
          slug: "test-product",
          title: { en: "Test Product" },
          buy: { price: -50, currency: "SAR", uom: "PCS" },
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("creates product successfully for admin users", async () => {
      mockResolveMarketplaceContext.mockResolvedValue({
        userId: "admin-123",
        orgId: { toString: () => "org-123" },
        role: "SUPER_ADMIN",
      });

      mockProductCreate.mockResolvedValue({
        _id: "prod-new",
        sku: "SKU001",
        slug: "test-product",
        title: { en: "Test Product" },
      });
      const { POST } = await importRoute();

      const req = new NextRequest("http://localhost:3000/api/marketplace/products", {
        method: "POST",
        body: JSON.stringify({
          categoryId: "cat-1",
          sku: "SKU001",
          slug: "test-product",
          title: { en: "Test Product" },
          buy: { price: 100, currency: "SAR", uom: "PCS" },
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
    });
  });
});
