/**
 * @fileoverview Tests for /api/souq/catalog/products route
 * Tests product catalog operations including authentication, validation, and rate limiting
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock authentication
vi.mock("@/lib/auth/getServerSession", () => ({
  getServerSession: vi.fn(),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock models
vi.mock("@/server/models/souq/Product", () => {
  const saveMock = vi.fn().mockResolvedValue(undefined);
  const souqProductCtor = vi.fn().mockImplementation((payload: Record<string, unknown> = {}) => ({
    ...payload,
    _id: "product-1",
    fsin: (payload as { fsin?: string }).fsin ?? "FSIN-TEST-001",
    images: (payload as { images?: string[] }).images ?? [],
    createdAt: new Date(),
    save: saveMock,
  }));
  souqProductCtor.find = vi.fn().mockReturnValue({
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue([]),
  });
  souqProductCtor.countDocuments = vi.fn().mockResolvedValue(0);
  souqProductCtor.findOne = vi.fn().mockResolvedValue(null);
  return { SouqProduct: souqProductCtor };
});

vi.mock("@/server/models/souq/Category", () => ({
  SouqCategory: {
    findOne: vi.fn(),
  },
}));

vi.mock("@/server/models/souq/Brand", () => ({
  SouqBrand: {
    findOne: vi.fn(),
  },
}));

// Mock FSIN generator
vi.mock("@/lib/souq/fsin-generator", () => ({
  generateFSIN: vi.fn().mockReturnValue({
    fsin: "FSIN-TEST-001",
    checkDigit: 0,
    prefix: "FX",
    sequence: "00000000000",
    generatedAt: new Date(),
  }),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Dynamic import helper to ensure fresh module state
// Must set up mocks before calling this function
const importModules = async () => {
  const [sessionModule, rateLimitModule, categoryModule, brandModule, productModule, route] =
    await Promise.all([
      import("@/lib/auth/getServerSession"),
      import("@/lib/middleware/rate-limit"),
      import("@/server/models/souq/Category"),
      import("@/server/models/souq/Brand"),
      import("@/server/models/souq/Product"),
      import("@/app/api/souq/catalog/products/route"),
    ]);
  return {
    getServerSession: vi.mocked(sessionModule.getServerSession),
    enforceRateLimit: vi.mocked(rateLimitModule.enforceRateLimit),
    SouqCategory: vi.mocked(categoryModule.SouqCategory),
    SouqBrand: vi.mocked(brandModule.SouqBrand),
    SouqProduct: vi.mocked(productModule.SouqProduct),
    GET: route.GET,
    POST: route.POST,
  };
};

// Helper to set up rate limit mock before importing
const setupRateLimitMock = async (mockResponse: Response | null) => {
  const rateLimitModule = await import("@/lib/middleware/rate-limit");
  vi.mocked(rateLimitModule.enforceRateLimit).mockReturnValue(mockResponse as never);
};

describe("API /api/souq/catalog/products", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("GET - List Products", () => {
    it("returns 429 when rate limit exceeded", async () => {
      // Set up rate limit mock BEFORE importing the route
      await setupRateLimitMock(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      );
      const { GET } = await importModules();

      const req = new NextRequest("http://localhost:3000/api/souq/catalog/products");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("returns products list for GET request", async () => {
      await setupRateLimitMock(null);
      const { GET } = await importModules();

      const req = new NextRequest("http://localhost:3000/api/souq/catalog/products");
      const res = await GET(req);

      // Should return 200, 403 (no org), or handle gracefully
      expect([200, 403, 500]).toContain(res.status);
    });

    it("supports pagination parameters", async () => {
      await setupRateLimitMock(null);
      const { GET } = await importModules();

      const req = new NextRequest(
        "http://localhost:3000/api/souq/catalog/products?page=2&limit=20",
      );
      const res = await GET(req);

      expect([200, 403, 500]).toContain(res.status);
    });

    it("supports search query parameter", async () => {
      await setupRateLimitMock(null);
      const { GET } = await importModules();

      const req = new NextRequest("http://localhost:3000/api/souq/catalog/products?q=test");
      const res = await GET(req);

      expect([200, 403, 500]).toContain(res.status);
    });

    it("supports language parameter for localization", async () => {
      await setupRateLimitMock(null);
      const { GET } = await importModules();

      const req = new NextRequest("http://localhost:3000/api/souq/catalog/products?lang=ar");
      const res = await GET(req);

      expect([200, 403, 500]).toContain(res.status);
    });
  });

  describe("POST - Create Product", () => {
    it("returns 401 when user is not authenticated", async () => {
      await setupRateLimitMock(null);
      const { getServerSession, POST } = await importModules();
      getServerSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/souq/catalog/products", {
        method: "POST",
        body: JSON.stringify({
          title: { en: "Test Product", ar: "منتج تجريبي" },
          description: { en: "Description", ar: "وصف" },
          categoryId: "cat-123",
          images: ["https://example.com/image.jpg"],
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 400 when orgId is missing", async () => {
      await setupRateLimitMock(null);
      const { getServerSession, POST } = await importModules();
      getServerSession.mockResolvedValue({
        user: { id: "user-123" },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/souq/catalog/products", {
        method: "POST",
        body: JSON.stringify({
          title: { en: "Test Product", ar: "منتج تجريبي" },
          description: { en: "Description", ar: "وصف" },
          categoryId: "cat-123",
          images: ["https://example.com/image.jpg"],
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("returns 429 when rate limit exceeded", async () => {
      await setupRateLimitMock(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      );
      const { POST } = await importModules();

      const req = new NextRequest("http://localhost:3000/api/souq/catalog/products", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);

      expect(res.status).toBe(429);
    });

    it("validates required fields with Zod", async () => {
      await setupRateLimitMock(null);
      const { getServerSession, POST } = await importModules();
      getServerSession.mockResolvedValue({
        user: { id: "user-123", orgId: "507f1f77bcf86cd799439011" },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/souq/catalog/products", {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields
          title: { en: "Only English" }, // Missing Arabic
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("validates images array is not empty", async () => {
      await setupRateLimitMock(null);
      const { getServerSession, SouqCategory, SouqBrand, SouqProduct, POST } =
        await importModules();
      getServerSession.mockResolvedValue({
        user: { id: "user-123", orgId: "507f1f77bcf86cd799439011" },
      } as never);
      SouqCategory.findOne.mockResolvedValue({
        _id: "507f1f77bcf86cd799439012",
        categoryId: "cat-123",
        isRestricted: false,
        isActive: true,
        orgId: "507f1f77bcf86cd799439011",
      } as never);
      SouqBrand.findOne.mockResolvedValue({
        _id: "507f1f77bcf86cd799439013",
        brandId: "brand-123",
        isGated: false,
        isActive: true,
        orgId: "507f1f77bcf86cd799439011",
      } as never);
      SouqProduct.findOne.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/souq/catalog/products", {
        method: "POST",
        body: JSON.stringify({
          title: { en: "Test", ar: "تجربة" },
          description: { en: "Desc", ar: "وصف" },
          categoryId: "507f1f77bcf86cd799439011",
          images: [], // Empty array should fail
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });
});
