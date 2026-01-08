/**
 * @fileoverview Tests for /api/souq/buybox/winner/[fsin] route
 * @description Buy Box winner calculation
 * @sprint 73
 * @coverage
 * - GET /api/souq/buybox/winner/[fsin] - Get Buy Box winner
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE
// ============================================================================
let mockRateLimitResponse: Response | null = null;
let mockWinner: unknown = null;

// Mock dependencies before import
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

vi.mock("@/services/souq/buybox-service", () => ({
  BuyBoxService: {
    calculateBuyBoxWinner: vi.fn(async () => mockWinner),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import route after mocks
import { GET } from "@/app/api/souq/buybox/winner/[fsin]/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq BuyBox Winner API", () => {
  const validOrgId = "507f1f77bcf86cd799439011";
  const validFsin = "FSIN-12345-ABCDE";

  beforeEach(() => {
    mockRateLimitResponse = null;
    mockWinner = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (
    fsin: string,
    queryParams?: Record<string, string>
  ) => {
    const url = new URL(`http://localhost/api/souq/buybox/winner/${fsin}`);
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    return new NextRequest(url.toString(), { method: "GET" });
  };

  const createContext = (fsin: string) => ({
    params: Promise.resolve({ fsin }),
  });

  // ==========================================================================
  // Validation
  // ==========================================================================
  describe("Validation", () => {
    it("returns 429 when rate limit exceeded", async () => {
      mockRateLimitResponse = new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429 }
      );

      const req = createRequest(validFsin, { orgId: validOrgId });
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(429);
    });

    it("returns 400 when FSIN is missing", async () => {
      const req = createRequest("", { orgId: validOrgId });
      const ctx = createContext("");
      const response = await GET(req, ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("FSIN is required");
    });

    it("returns 400 when orgId is missing", async () => {
      const req = createRequest(validFsin);
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("orgId is required");
    });
  });

  // ==========================================================================
  // Successful Winner Retrieval
  // ==========================================================================
  describe("Successful Winner Retrieval", () => {
    it("returns Buy Box winner successfully", async () => {
      mockWinner = {
        sellerId: "seller123",
        sellerName: "Top Rated Seller",
        price: 99.99,
        shipping: 0,
        totalPrice: 99.99,
        deliveryDays: 2,
        sellerRating: 4.9,
        fulfillmentMethod: "FBF",
        inStock: true,
        stockCount: 50,
      };

      const req = createRequest(validFsin, { orgId: validOrgId });
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.winner).toBeDefined();
      expect(data.winner.sellerId).toBe("seller123");
      expect(data.winner.price).toBe(99.99);
      expect(data.winner.sellerRating).toBe(4.9);
    });

    it("returns 404 when no eligible sellers found", async () => {
      mockWinner = null;

      const req = createRequest(validFsin, { orgId: validOrgId });
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain("No eligible sellers found");
    });

    it("includes fulfillment details in winner", async () => {
      mockWinner = {
        sellerId: "seller456",
        price: 150.00,
        shipping: 10.00,
        totalPrice: 160.00,
        deliveryDays: 5,
        fulfillmentMethod: "SELLER",
        sellerRating: 4.2,
      };

      const req = createRequest(validFsin, { orgId: validOrgId });
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.winner.totalPrice).toBe(160.00);
      expect(data.winner.fulfillmentMethod).toBe("SELLER");
      expect(data.winner.deliveryDays).toBe(5);
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================
  describe("Error Handling", () => {
    it("handles service errors gracefully", async () => {
      const { BuyBoxService } = await import("@/services/souq/buybox-service");
      vi.mocked(BuyBoxService.calculateBuyBoxWinner).mockRejectedValueOnce(
        new Error("Algorithm calculation failed")
      );

      const req = createRequest(validFsin, { orgId: validOrgId });
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain("Failed to get Buy Box winner");
    });
  });
});
