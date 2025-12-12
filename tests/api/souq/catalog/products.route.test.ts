/**
 * @fileoverview Tests for Souq Products/Catalog API
 * @description Comprehensive tests for product catalog endpoints with Zod validation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Mock services
const mockFindProducts = vi.fn();
const mockCreateProduct = vi.fn();
const mockFindCategory = vi.fn();

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/souq/Product", () => ({
  SouqProduct: {
    find: () => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () => mockFindProducts(),
          }),
        }),
      }),
    }),
    create: (data: unknown) => mockCreateProduct(data),
    countDocuments: vi.fn().mockResolvedValue(10),
  },
}));

vi.mock("@/server/models/souq/Category", () => ({
  SouqCategory: {
    findOne: (query: unknown) => mockFindCategory(query),
  },
}));

vi.mock("@/server/models/souq/Brand", () => ({
  SouqBrand: {
    findById: vi.fn().mockResolvedValue({ name: "TestBrand" }),
  },
}));

vi.mock("@/lib/souq/fsin-generator", () => ({
  generateFSIN: vi.fn().mockReturnValue("FSIN_TEST_123"),
}));

const mockGetServerSession = vi.fn();
vi.mock("@/lib/auth/getServerSession", () => ({
  getServerSession: () => mockGetServerSession(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import routes after mocks
import { GET, POST } from "@/app/api/souq/catalog/products/route";

const makeRequest = (
  url: string,
  method: string,
  body?: Record<string, unknown>
): NextRequest =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;

describe("Souq Catalog Products API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindProducts.mockResolvedValue([]);
    mockFindCategory.mockResolvedValue({
      categoryId: "cat_123",
      isActive: true,
      isRestricted: false,
    });
  });

  describe("POST /api/souq/catalog/products", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const req = makeRequest("https://example.com/api/souq/catalog/products", "POST", {
        title: { en: "Test", ar: "اختبار" },
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 400 when orgId is missing", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user_1" },
      });

      const req = makeRequest("https://example.com/api/souq/catalog/products", "POST", {
        title: { en: "Test", ar: "اختبار" },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Organization");
    });

    it("validates required fields with Zod", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user_1", orgId: "507f1f77bcf86cd799439011" },
      });

      // Missing required title
      const req = makeRequest("https://example.com/api/souq/catalog/products", "POST", {
        description: { en: "Desc", ar: "وصف" },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("validates title must include both en and ar", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user_1", orgId: "507f1f77bcf86cd799439011" },
      });

      const req = makeRequest("https://example.com/api/souq/catalog/products", "POST", {
        title: { en: "Test Only" }, // Missing Arabic
        description: { en: "Desc", ar: "وصف" },
        categoryId: "cat_123",
        images: ["https://example.com/img.jpg"],
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("validates images must have at least one entry", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user_1", orgId: "507f1f77bcf86cd799439011" },
      });

      const req = makeRequest("https://example.com/api/souq/catalog/products", "POST", {
        title: { en: "Test", ar: "اختبار" },
        description: { en: "Desc", ar: "وصف" },
        categoryId: "cat_123",
        images: [], // Empty images array
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("returns 404 when category not found", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user_1", orgId: "507f1f77bcf86cd799439011" },
      });
      mockFindCategory.mockResolvedValue(null);

      const req = makeRequest("https://example.com/api/souq/catalog/products", "POST", {
        title: { en: "Test", ar: "اختبار" },
        description: { en: "Desc", ar: "وصف" },
        categoryId: "invalid_cat",
        images: ["https://example.com/img.jpg"],
      });
      const res = await POST(req);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toContain("Category");
    });

    it("creates product with valid data", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "seller_1", orgId: "507f1f77bcf86cd799439011" },
      });
      mockCreateProduct.mockResolvedValue({
        _id: "prod_new",
        fsin: "FSIN_TEST_123",
      });

      const req = makeRequest("https://example.com/api/souq/catalog/products", "POST", {
        title: { en: "Test Product", ar: "منتج اختبار" },
        description: { en: "Description", ar: "وصف" },
        categoryId: "cat_123",
        images: ["https://example.com/img.jpg"],
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
    });
  });

  describe("GET /api/souq/catalog/products", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const req = makeRequest("https://example.com/api/souq/catalog/products", "GET");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns products for authenticated user", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user_1", orgId: "org_123" },
      });
      mockFindProducts.mockResolvedValue([
        { _id: "prod_1", title: { en: "Product 1" }, fsin: "FSIN_1" },
      ]);

      const req = makeRequest("https://example.com/api/souq/catalog/products", "GET");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.products).toHaveLength(1);
    });

    it("supports search query parameter", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user_1", orgId: "org_123" },
      });
      mockFindProducts.mockResolvedValue([]);

      const req = makeRequest(
        "https://example.com/api/souq/catalog/products?search=laptop",
        "GET"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("supports category filter", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user_1", orgId: "org_123" },
      });
      mockFindProducts.mockResolvedValue([]);

      const req = makeRequest(
        "https://example.com/api/souq/catalog/products?categoryId=electronics",
        "GET"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("supports pagination", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user_1", orgId: "org_123" },
      });
      mockFindProducts.mockResolvedValue([]);

      const req = makeRequest(
        "https://example.com/api/souq/catalog/products?page=2&limit=20",
        "GET"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });
});
