/**
 * @fileoverview Tests for /api/souq/analytics/traffic route
 * @description Traffic and engagement analytics for Souq sellers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE
// ============================================================================
type SessionUser = { id: string; orgId: string; role: string } | null;
let mockSession: { user: SessionUser } | null = null;
let mockRateLimitResponse: Response | null = null;
let mockTrafficAnalytics: unknown = null;

// Mock dependencies before import
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

vi.mock("@/services/souq/analytics/analytics-service", () => ({
  analyticsService: {
    getTrafficAnalytics: vi.fn(async () => mockTrafficAnalytics),
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
import { GET } from "@/app/api/souq/analytics/traffic/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq Analytics Traffic API", () => {
  beforeEach(() => {
    mockSession = null;
    mockRateLimitResponse = null;
    mockTrafficAnalytics = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/souq/analytics/traffic", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = null;
      const req = new NextRequest("http://localhost/api/souq/analytics/traffic");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("should return 429 when rate limited", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockRateLimitResponse = new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 });
      const req = new NextRequest("http://localhost/api/souq/analytics/traffic");
      const res = await GET(req);
      expect(res.status).toBe(429);
    });

    it("should reject requests without org context", async () => {
      mockSession = { user: { id: "user1", orgId: "", role: "seller" } };
      const req = new NextRequest("http://localhost/api/souq/analytics/traffic");
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("should return traffic analytics", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockTrafficAnalytics = {
        pageViews: 12500,
        uniqueVisitors: 3200,
        bounceRate: 45.5,
        avgSessionDuration: 180,
        trends: { growth: 12.3 },
      };
      const req = new NextRequest("http://localhost/api/souq/analytics/traffic");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.pageViews).toBe(12500);
      expect(data.uniqueVisitors).toBe(3200);
      expect(data.bounceRate).toBe(45.5);
    });

    it("should accept period query parameter", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockTrafficAnalytics = {
        pageViews: 45000,
        uniqueVisitors: 12000,
        period: "last_90_days",
      };
      const req = new NextRequest("http://localhost/api/souq/analytics/traffic?period=last_90_days");
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });
});
