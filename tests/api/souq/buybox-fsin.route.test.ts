/**
 * @fileoverview Tests for /api/souq/buybox/[fsin] route
 * @description Buy Box winner and offers retrieval
 * @sprint 73
 * @coverage
 * - GET /api/souq/buybox/[fsin] - Get buybox winner and all offers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE
// ============================================================================
type SessionUser = {
  id: string;
  orgId?: string;
  role?: string;
} | null;

let mockSession: SessionUser = null;
let mockRateLimitResponse: Response | null = null;
let mockBuyBoxWinner: unknown = null;
let mockAllOffers: unknown[] = [];

// Mock dependencies before import
vi.mock("@/lib/auth/getServerSession", () => ({
  getServerSession: vi.fn(async () => (mockSession ? { user: mockSession } : null)),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/souq/buybox-service", () => ({
  BuyBoxService: {
    calculateBuyBoxWinner: vi.fn(async () => mockBuyBoxWinner),
    getProductOffers: vi.fn(async () => mockAllOffers),
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
import { GET } from "@/app/api/souq/buybox/[fsin]/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq BuyBox [fsin] API", () => {
  const validOrgId = "507f1f77bcf86cd799439011";
  const validUserId = "507f1f77bcf86cd799439012";
  const validFsin = "FSIN-12345-ABCDE";

  beforeEach(() => {
    mockSession = null;
    mockRateLimitResponse = null;
    mockBuyBoxWinner = null;
    mockAllOffers = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (fsin: string) => {
    return new NextRequest(
      `http://localhost/api/souq/buybox/${fsin}`,
      { method: "GET" }
    );
  };

  const createContext = (fsin: string) => ({
    params: { fsin },
  });

  // ==========================================================================
  // Authentication & Authorization
  // ==========================================================================
  describe("Authentication & Authorization", () => {
    it("returns 429 when rate limit exceeded", async () => {
      mockRateLimitResponse = new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429 }
      );

      const req = createRequest(validFsin);
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(429);
    });

    it("returns 401 for unauthenticated user", async () => {
      mockSession = null;

      const req = createRequest(validFsin);
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 403 when orgId is missing", async () => {
      mockSession = { id: validUserId, role: "USER" };

      const req = createRequest(validFsin);
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Forbidden");
    });

    it("returns 400 when FSIN is missing", async () => {
      mockSession = { id: validUserId, orgId: validOrgId, role: "USER" };

      const req = createRequest("");
      const ctx = createContext("");
      const response = await GET(req, ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("FSIN is required");
    });
  });

  // ==========================================================================
  // Successful BuyBox Retrieval
  // ==========================================================================
  describe("Successful BuyBox Retrieval", () => {
    it("returns buybox winner and all offers", async () => {
      mockSession = { id: validUserId, orgId: validOrgId, role: "USER" };
      mockBuyBoxWinner = {
        sellerId: "seller123",
        price: 99.99,
        shipping: 0,
        deliveryDays: 2,
        sellerRating: 4.8,
      };
      mockAllOffers = [
        { sellerId: "seller123", price: 99.99, shipping: 0 },
        { sellerId: "seller456", price: 105.00, shipping: 5 },
        { sellerId: "seller789", price: 110.00, shipping: 0 },
      ];

      const req = createRequest(validFsin);
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.buyBoxWinner).toBeDefined();
      expect(data.data.buyBoxWinner.price).toBe(99.99);
      expect(data.data.allOffers).toHaveLength(3);
      expect(data.data.offerCount).toBe(3);
    });

    it("returns null winner when no eligible sellers", async () => {
      mockSession = { id: validUserId, orgId: validOrgId, role: "USER" };
      mockBuyBoxWinner = null;
      mockAllOffers = [];

      const req = createRequest(validFsin);
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.buyBoxWinner).toBeNull();
      expect(data.data.offerCount).toBe(0);
    });

    it("handles single offer (winner is the only seller)", async () => {
      mockSession = { id: validUserId, orgId: validOrgId, role: "USER" };
      mockBuyBoxWinner = {
        sellerId: "seller123",
        price: 150.00,
        shipping: 10,
      };
      mockAllOffers = [{ sellerId: "seller123", price: 150.00, shipping: 10 }];

      const req = createRequest(validFsin);
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.buyBoxWinner.sellerId).toBe("seller123");
      expect(data.data.offerCount).toBe(1);
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================
  describe("Error Handling", () => {
    it("handles service errors gracefully", async () => {
      mockSession = { id: validUserId, orgId: validOrgId, role: "USER" };

      const { BuyBoxService } = await import("@/services/souq/buybox-service");
      vi.mocked(BuyBoxService.calculateBuyBoxWinner).mockRejectedValueOnce(
        new Error("Service unavailable")
      );

      const req = createRequest(validFsin);
      const ctx = createContext(validFsin);
      const response = await GET(req, ctx);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain("Failed to fetch Buy Box data");
    });
  });
});
