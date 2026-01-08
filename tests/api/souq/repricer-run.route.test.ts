/**
 * @fileoverview Tests for /api/souq/repricer/run route
 * @description Auto-repricer manual trigger for sellers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE
// ============================================================================
type SessionUser = { id: string; orgId: string; role: string } | null;
let mockSession: { user: SessionUser } | null = null;
let mockRateLimitResponse: Response | null = null;
let mockSeller: unknown = null;
let mockRepricerResult: unknown = null;

// Mock dependencies before import
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

vi.mock("@/server/models/souq/Seller", () => ({
  SouqSeller: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn(async () => mockSeller),
    }),
  },
}));

vi.mock("@/services/souq/auto-repricer-service", () => ({
  AutoRepricerService: {
    repriceSeller: vi.fn(async () => mockRepricerResult),
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
import { POST } from "@/app/api/souq/repricer/run/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq Repricer Run API", () => {
  beforeEach(() => {
    mockSession = null;
    mockRateLimitResponse = null;
    mockSeller = null;
    mockRepricerResult = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/souq/repricer/run", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = null;
      const req = new NextRequest("http://localhost/api/souq/repricer/run", {
        method: "POST",
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should return 429 when rate limited", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockRateLimitResponse = new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 });
      const req = new NextRequest("http://localhost/api/souq/repricer/run", {
        method: "POST",
      });
      const res = await POST(req);
      expect(res.status).toBe(429);
    });

    it("should reject requests without org context", async () => {
      mockSession = { user: { id: "user1", orgId: "", role: "seller" } };
      const req = new NextRequest("http://localhost/api/souq/repricer/run", {
        method: "POST",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should return 404 when seller not found", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockSeller = null;
      const req = new NextRequest("http://localhost/api/souq/repricer/run", {
        method: "POST",
      });
      const res = await POST(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toMatch(/seller/i);
    });

    it("should run repricer successfully", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockSeller = { _id: "seller123", userId: "user1", orgId: "org1" };
      mockRepricerResult = {
        listingsProcessed: 50,
        pricesUpdated: 12,
        errors: 0,
        runTimeMs: 2500,
      };
      const req = new NextRequest("http://localhost/api/souq/repricer/run", {
        method: "POST",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.result.listingsProcessed).toBe(50);
      expect(data.result.pricesUpdated).toBe(12);
    });
  });
});
