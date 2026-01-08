/**
 * @fileoverview Tests for /api/souq/analytics/sales route
 * @description Sales performance analytics for Souq sellers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE
// ============================================================================
type SessionUser = { id: string; orgId: string; role: string } | null;
let mockSession: { user: SessionUser } | null = null;
let mockRateLimitResponse: Response | null = null;
let mockSalesMetrics: unknown = null;

// Mock dependencies before import
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

vi.mock("@/services/souq/analytics/analytics-service", () => ({
  analyticsService: {
    getSalesMetrics: vi.fn(async () => mockSalesMetrics),
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
import { GET } from "@/app/api/souq/analytics/sales/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq Analytics Sales API", () => {
  beforeEach(() => {
    mockSession = null;
    mockRateLimitResponse = null;
    mockSalesMetrics = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/souq/analytics/sales", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = null;
      const req = new NextRequest("http://localhost/api/souq/analytics/sales");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("should return 429 when rate limited", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockRateLimitResponse = new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 });
      const req = new NextRequest("http://localhost/api/souq/analytics/sales");
      const res = await GET(req);
      expect(res.status).toBe(429);
    });

    it("should reject requests without org context", async () => {
      mockSession = { user: { id: "user1", orgId: "", role: "seller" } };
      const req = new NextRequest("http://localhost/api/souq/analytics/sales");
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("should return sales metrics with default period", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockSalesMetrics = {
        totalRevenue: 15000.00,
        orderCount: 120,
        avgOrderValue: 125.00,
        trends: { growth: 15.5 },
        period: "last_30_days",
      };
      const req = new NextRequest("http://localhost/api/souq/analytics/sales");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.totalRevenue).toBe(15000.00);
      expect(data.orderCount).toBe(120);
    });

    it("should accept period query parameter", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockSalesMetrics = {
        totalRevenue: 5000.00,
        orderCount: 40,
        avgOrderValue: 125.00,
        period: "last_7_days",
      };
      const req = new NextRequest("http://localhost/api/souq/analytics/sales?period=last_7_days");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("should support ytd period", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockSalesMetrics = {
        totalRevenue: 150000.00,
        orderCount: 1200,
        avgOrderValue: 125.00,
        period: "ytd",
      };
      const req = new NextRequest("http://localhost/api/souq/analytics/sales?period=ytd");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.totalRevenue).toBe(150000.00);
    });
  });
});
