/**
 * @fileoverview Tests for /api/souq/buybox/offers/[fsin] route
 * @description Product offers retrieval (Other Sellers section)
 * @sprint 73
 * @coverage
 * - GET /api/souq/buybox/offers/[fsin] - Get all offers for a product
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE
// ============================================================================
let mockRateLimitResponse: Response | null = null;
let mockOffers: unknown[] = [];

// Mock dependencies before import
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

vi.mock("@/services/souq/buybox-service", () => ({
  BuyBoxService: {
    getProductOffers: vi.fn(async () => mockOffers),
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
import { GET } from "@/app/api/souq/buybox/offers/[fsin]/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq BuyBox Offers API", () => {
  const validOrgId = "507f1f77bcf86cd799439011";
  const validFsin = "FSIN-12345-ABCDE";

  beforeEach(() => {
    mockRateLimitResponse = null;
    mockOffers = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (
    fsin: string,
    queryParams?: Record<string, string>
  ) => {
    const url = new URL(`http://localhost/api/souq/buybox/offers/${fsin}`);
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
  // Successful Offers Retrieval
  // ==========================================================================
  describe("Successful Offers Retrieval", () => {
    it("returns all offers for a product", async () => {
      mockOffers = [
        {
          sellerId: "seller123",
          sellerName: "Best Seller",
          price: 99.99,
          shipping: 0,
          condition: "new",
          rating: 4.8,
        },
        {
          sellerId: "seller456",
          sellerName: "Good Deals",
          price: 105.00,
          shipping: 5,
          condition: "new",
          rating: 4.5,
        },
        {
          sellerId: "seller789",
          sellerName: "Value Store",
          price: 110.00,
          shipping: 0,
          condition: "new",
          rating: 4.2,
        },
      ];

      const req = createRequest(validFsin, { orgId: validOrgId });
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.offers).toHaveLength(3);
      expect(data.total).toBe(3);
      expect(data.offers[0].price).toBe(99.99);
    });

    it("returns empty offers when no sellers", async () => {
      mockOffers = [];

      const req = createRequest(validFsin, { orgId: validOrgId });
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.offers).toHaveLength(0);
      expect(data.total).toBe(0);
    });

    it("passes condition filter to service", async () => {
      mockOffers = [
        { sellerId: "seller123", price: 80.00, condition: "refurbished" },
      ];

      const req = createRequest(validFsin, {
        orgId: validOrgId,
        condition: "refurbished",
      });
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.offers[0].condition).toBe("refurbished");

      const { BuyBoxService } = await import("@/services/souq/buybox-service");
      expect(BuyBoxService.getProductOffers).toHaveBeenCalledWith(
        validFsin,
        expect.objectContaining({ condition: "refurbished" })
      );
    });

    it("passes sort option to service", async () => {
      mockOffers = [{ sellerId: "seller123", price: 99.99, rating: 4.9 }];

      const req = createRequest(validFsin, {
        orgId: validOrgId,
        sort: "rating",
      });
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);

      const { BuyBoxService } = await import("@/services/souq/buybox-service");
      expect(BuyBoxService.getProductOffers).toHaveBeenCalledWith(
        validFsin,
        expect.objectContaining({ sort: "rating" })
      );
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================
  describe("Error Handling", () => {
    it("handles service errors gracefully", async () => {
      const { BuyBoxService } = await import("@/services/souq/buybox-service");
      vi.mocked(BuyBoxService.getProductOffers).mockRejectedValueOnce(
        new Error("Database connection failed")
      );

      const req = createRequest(validFsin, { orgId: validOrgId });
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain("Failed to get product offers");
    });
  });
});
