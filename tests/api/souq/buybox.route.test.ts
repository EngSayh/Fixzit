/**
 * @fileoverview Tests for /api/souq/buybox/[fsin] route
 * @description Buy Box winner and competing offers retrieval
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE
// ============================================================================
type SessionUser = { id: string; orgId: string; role: string } | null;
let mockSession: { user: SessionUser } | null = null;
let mockRateLimitResponse: Response | null = null;
let mockBuyBoxWinner: unknown = null;
let mockAllOffers: unknown[] = [];

// Mock dependencies before import
vi.mock("@/lib/auth/getServerSession", () => ({
  getServerSession: vi.fn(async () => mockSession),
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

describe("Souq BuyBox API", () => {
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
    return new NextRequest(`http://localhost/api/souq/buybox/${fsin}`);
  };

  const createContext = (fsin: string) => ({
    params: { fsin },
  });

  describe("GET /api/souq/buybox/[fsin]", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = null;
      const req = createRequest("FSIN-001");
      const res = await GET(req, createContext("FSIN-001"));
      expect(res.status).toBe(401);
    });

    it("should return 429 when rate limited", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockRateLimitResponse = new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 });
      const req = createRequest("FSIN-001");
      const res = await GET(req, createContext("FSIN-001"));
      expect(res.status).toBe(429);
    });

    it("should reject requests without org context", async () => {
      mockSession = { user: { id: "user1", orgId: "", role: "seller" } };
      const req = createRequest("FSIN-001");
      const res = await GET(req, createContext("FSIN-001"));
      expect(res.status).toBe(403);
    });

    it("should return buy box data for valid FSIN", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockBuyBoxWinner = {
        sellerId: "seller1",
        price: 99.99,
        condition: "new",
        fulfillment: "FBF",
      };
      mockAllOffers = [
        { sellerId: "seller1", price: 99.99 },
        { sellerId: "seller2", price: 105.00 },
      ];
      const req = createRequest("FSIN-001");
      const res = await GET(req, createContext("FSIN-001"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.buyBoxWinner).toBeDefined();
      expect(data.data.allOffers).toHaveLength(2);
      expect(data.data.offerCount).toBe(2);
    });

    it("should return empty offers when no sellers", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockBuyBoxWinner = null;
      mockAllOffers = [];
      const req = createRequest("FSIN-002");
      const res = await GET(req, createContext("FSIN-002"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.offerCount).toBe(0);
    });
  });
});
