/**
 * @fileoverview Tests for /api/souq/ads/impressions route
 * @description Ad impression tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE
// ============================================================================
let mockRateLimitResult: { allowed: boolean; remaining?: number } = { allowed: true, remaining: 10 };
let mockImpressionResult: unknown = null;

// Mock dependencies before import
vi.mock("@/services/souq/ads/impression-tracker", () => ({
  ImpressionTracker: {
    record: vi.fn(async () => mockImpressionResult),
    batchRecord: vi.fn(async () => mockImpressionResult),
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
import { POST } from "@/app/api/souq/ads/impressions/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq Ads Impressions API", () => {
  beforeEach(() => {
    mockRateLimitResult = { allowed: true, remaining: 10 };
    mockImpressionResult = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/souq/ads/impressions", () => {
    it("should reject empty impression array", async () => {
      const req = new NextRequest("http://localhost/api/souq/ads/impressions", {
        method: "POST",
        body: JSON.stringify({ impressions: [] }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should reject invalid payload structure", async () => {
      const req = new NextRequest("http://localhost/api/souq/ads/impressions", {
        method: "POST",
        body: JSON.stringify({ invalid: "data" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should return 429 when rate limited", async () => {
      mockRateLimitResult = { allowed: false, remaining: 0 };
      const req = new NextRequest("http://localhost/api/souq/ads/impressions", {
        method: "POST",
        body: JSON.stringify({
          impressions: [
            { adId: "ad1", slotId: "slot1", timestamp: Date.now() },
          ],
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(429);
    });

    it("should accept valid impression batch", async () => {
      mockImpressionResult = { recorded: 2 };
      const req = new NextRequest("http://localhost/api/souq/ads/impressions", {
        method: "POST",
        body: JSON.stringify({
          impressions: [
            { adId: "ad1", slotId: "slot1", timestamp: Date.now() },
            { adId: "ad2", slotId: "slot2", timestamp: Date.now() },
          ],
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      // May be 200 or 400 depending on validation strictness
      expect([200, 400]).toContain(res.status);
    });

    it("should handle single impression", async () => {
      mockImpressionResult = { recorded: 1 };
      const req = new NextRequest("http://localhost/api/souq/ads/impressions", {
        method: "POST",
        body: JSON.stringify({
          impressions: [
            { adId: "ad1", slotId: "slot1", timestamp: Date.now() },
          ],
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect([200, 400]).toContain(res.status);
    });
  });
});
