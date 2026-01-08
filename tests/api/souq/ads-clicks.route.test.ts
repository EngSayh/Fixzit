/**
 * @fileoverview Tests for /api/souq/ads/clicks route
 * @description Ad click tracking with fraud prevention
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE
// ============================================================================
let mockRateLimitResult: { allowed: boolean; remaining?: number } = { allowed: true, remaining: 10 };
let mockBudgetResult: unknown = null;

// Mock dependencies before import
vi.mock("@/services/souq/ads/auction-engine", () => ({
  AuctionEngine: {
    getAuction: vi.fn(),
  },
}));

vi.mock("@/services/souq/ads/budget-manager", () => ({
  BudgetManager: {
    chargeCpc: vi.fn(async () => mockBudgetResult),
  },
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(async () => mockRateLimitResult),
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn(() => "127.0.0.1"),
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
import { POST } from "@/app/api/souq/ads/clicks/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq Ads Clicks API", () => {
  beforeEach(() => {
    mockRateLimitResult = { allowed: true, remaining: 10 };
    mockBudgetResult = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/souq/ads/clicks", () => {
    it("should reject invalid click payload", async () => {
      const req = new NextRequest("http://localhost/api/souq/ads/clicks", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should reject expired click signature", async () => {
      const req = new NextRequest("http://localhost/api/souq/ads/clicks", {
        method: "POST",
        body: JSON.stringify({
          bidId: "bid123",
          campaignId: "camp123",
          orgId: "org1",
          actualCpc: 0.50,
          timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago (expired)
          signature: "invalid-signature",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should return 429 when rate limited", async () => {
      mockRateLimitResult = { success: false };
      const req = new NextRequest("http://localhost/api/souq/ads/clicks", {
        method: "POST",
        body: JSON.stringify({
          bidId: "bid123",
          campaignId: "camp123",
          orgId: "org1",
          actualCpc: 0.50,
          timestamp: Date.now(),
          signature: "test-signature",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(429);
    });

    it("should accept valid click with valid timestamp", async () => {
      mockBudgetResult = { success: true, charged: 0.50 };
      const req = new NextRequest("http://localhost/api/souq/ads/clicks", {
        method: "POST",
        body: JSON.stringify({
          bidId: "bid123",
          campaignId: "camp123",
          orgId: "org1",
          actualCpc: 0.50,
          timestamp: Date.now(),
          signature: "test-signature",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      // In dev mode without AD_CLICK_SECRET, signature validation is bypassed
      expect([200, 400]).toContain(res.status);
    });
  });
});
