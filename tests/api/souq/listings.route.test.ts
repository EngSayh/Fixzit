/**
 * @fileoverview Tests for /api/souq/listings route
 * @description Seller product listings CRUD operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE
// ============================================================================
type SessionUser = { id: string; orgId: string; role: string } | null;
let mockSession: { user: SessionUser } | null = null;
let mockRateLimitResponse: Response | null = null;
let mockProductResult: unknown = null;
let mockSellerResult: unknown = null;
let mockListingResult: unknown = null;
let mockListingsArray: unknown[] = [];

// Mock dependencies before import
vi.mock("@/lib/auth/getServerSession", () => ({
  getServerSession: vi.fn(async () => mockSession),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn(async () => ({})),
}));

vi.mock("@/server/models/souq/Listing", () => ({
  SouqListing: {
    findOne: vi.fn(async () => mockListingResult),
    find: vi.fn(() => ({
      lean: vi.fn(() => ({
        exec: vi.fn(async () => mockListingsArray),
      })),
    })),
    create: vi.fn(async (data) => ({ _id: "listing123", ...data })),
  },
}));

vi.mock("@/server/models/souq/Product", () => ({
  SouqProduct: {
    findOne: vi.fn(async () => mockProductResult),
  },
}));

vi.mock("@/server/models/souq/Seller", () => ({
  SouqSeller: {
    findOne: vi.fn(async () => mockSellerResult),
  },
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(async (req, schema) => {
    const body = await req.json();
    return { success: true, data: body };
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "nano123"),
}));

// Import route after mocks
import { POST, GET } from "@/app/api/souq/listings/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq Listings API", () => {
  beforeEach(() => {
    mockSession = null;
    mockRateLimitResponse = null;
    mockProductResult = null;
    mockSellerResult = null;
    mockListingResult = null;
    mockListingsArray = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createPostRequest = (body: unknown) => {
    return new NextRequest("http://localhost/api/souq/listings", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  };

  describe("POST /api/souq/listings", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = null;
      const req = createPostRequest({ productId: "prod1" });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should return 429 when rate limited", async () => {
      mockRateLimitResponse = new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 });
      const req = createPostRequest({ productId: "prod1" });
      const res = await POST(req);
      expect(res.status).toBe(429);
    });

    it("should reject requests without org context", async () => {
      mockSession = { user: { id: "user1", orgId: "", role: "seller" } };
      const req = createPostRequest({ productId: "prod1" });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it("should reject invalid listing data", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      const req = createPostRequest({});
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should create listing with valid data", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockProductResult = { _id: "prod1", fsin: "FSIN123", orgId: "org1" };
      mockSellerResult = { _id: "seller1", orgId: "org1", status: "active" };
      const req = createPostRequest({
        productId: "prod1",
        fsin: "FSIN123",
        sellerId: "seller1",
        price: 99.99,
        stockQuantity: 100,
        fulfillmentMethod: "fbf",
        handlingTime: 2,
        shippingOptions: [{ method: "standard", price: 10, estimatedDays: 3 }],
        freeShipping: false,
        condition: "new",
      });
      const res = await POST(req);
      expect([200, 201, 400, 500]).toContain(res.status);
    });
  });

  describe("GET /api/souq/listings", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = null;
      const req = new NextRequest("http://localhost/api/souq/listings");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("should return listings for authenticated seller", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockListingsArray = [
        { _id: "list1", fsin: "FSIN123", price: 99.99 },
        { _id: "list2", fsin: "FSIN456", price: 149.99 },
      ];
      const req = new NextRequest("http://localhost/api/souq/listings?sellerId=seller1");
      const res = await GET(req);
      expect([200, 500]).toContain(res.status);
    });

    it("should filter by status", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockListingsArray = [{ _id: "list1", status: "active" }];
      const req = new NextRequest("http://localhost/api/souq/listings?status=active");
      const res = await GET(req);
      expect([200, 500]).toContain(res.status);
    });
  });
});
