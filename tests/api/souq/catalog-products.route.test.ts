/**
 * @fileoverview Tests for /api/souq/catalog/products route
 * Tests product catalog operations including authentication, validation, and rate limiting
 * 
 * Pattern: Module-scoped mutable state for mocks (per TESTING_STRATEGY.md)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// === Module-scoped mutable state (survives vi.clearAllMocks) ===
type SessionUser = { id?: string; orgId?: string; role?: string };
let sessionUser: SessionUser | null = null;
let mockRateLimitResponse: Response | null = null;

// Mock authentication with module-scoped state
vi.mock("@/lib/auth/getServerSession", () => ({
  getServerSession: vi.fn(async () => {
    if (!sessionUser) return null;
    return { user: sessionUser };
  }),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock rate limiting with module-scoped state
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: () => mockRateLimitResponse,
}));

// Mock cache
vi.mock("@/lib/cache", () => ({
  getCache: vi.fn().mockResolvedValue(null),
  setCache: vi.fn().mockResolvedValue(undefined),
  invalidateCache: vi.fn().mockResolvedValue(undefined),
  CacheTTL: { SHORT: 60, MEDIUM: 300, LONG: 3600, FIVE_MINUTES: 300 },
}));

// Mock cache headers utility
vi.mock("@/lib/api/cache-headers", () => ({
  applyCacheHeaders: vi.fn((res: Response) => res),
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
    select: vi.fn().mockReturnThis(),
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

// Dynamic import helper - forces fresh module load with mocks applied
async function importRoute() {
  vi.resetModules();
  const mod = await import("@/app/api/souq/catalog/products/route");
  return { GET: mod.GET, POST: mod.POST };
}

describe("API /api/souq/catalog/products", () => {
  beforeEach(() => {
    sessionUser = null;
    mockRateLimitResponse = null;
    vi.clearAllMocks();
  });

  describe("GET - List Products", () => {
    it("returns 429 when rate limit exceeded", async () => {
      mockRateLimitResponse = NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
      const { GET } = await importRoute();

      const req = new NextRequest("http://localhost:3000/api/souq/catalog/products");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("returns products list for GET request", async () => {
      sessionUser = { id: "user123", orgId: "507f1f77bcf86cd799439011", role: "SELLER" };
      const { GET } = await importRoute();

      const req = new NextRequest("http://localhost:3000/api/souq/catalog/products");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("supports pagination parameters", async () => {
      sessionUser = { id: "user123", orgId: "507f1f77bcf86cd799439011", role: "SELLER" };
      const { GET } = await importRoute();

      const req = new NextRequest(
        "http://localhost:3000/api/souq/catalog/products?page=2&limit=20"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("supports search query parameter", async () => {
      sessionUser = { id: "user123", orgId: "507f1f77bcf86cd799439011", role: "SELLER" };
      const { GET } = await importRoute();

      const req = new NextRequest("http://localhost:3000/api/souq/catalog/products?q=test");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("supports language parameter for localization", async () => {
      sessionUser = { id: "user123", orgId: "507f1f77bcf86cd799439011", role: "SELLER" };
      const { GET } = await importRoute();

      const req = new NextRequest("http://localhost:3000/api/souq/catalog/products?lang=ar");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });

  describe("POST - Create Product", () => {
    it("returns 401 when user is not authenticated", async () => {
      sessionUser = null; // No session
      const { POST } = await importRoute();

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
      sessionUser = { id: "user-123" }; // No orgId
      const { POST } = await importRoute();

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
      mockRateLimitResponse = NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
      const { POST } = await importRoute();

      const req = new NextRequest("http://localhost:3000/api/souq/catalog/products", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);

      expect(res.status).toBe(429);
    });

    it("validates required fields with Zod", async () => {
      sessionUser = { id: "user-123", orgId: "507f1f77bcf86cd799439011" };
      const { POST } = await importRoute();

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
      sessionUser = { id: "user-123", orgId: "507f1f77bcf86cd799439011" };
      const { POST } = await importRoute();

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

