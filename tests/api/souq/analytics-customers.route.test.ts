/**
 * @fileoverview Tests for /api/souq/analytics/customers route
 * @description Customer behavior analytics for Souq sellers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE
// ============================================================================
type SessionUser = { id: string; orgId: string; role: string } | null;
let mockSession: { user: SessionUser } | null = null;
let mockRateLimitResponse: Response | null = null;
let mockCustomerInsights: unknown = null;

// Mock dependencies before import
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

vi.mock("@/services/souq/analytics/analytics-service", () => ({
  analyticsService: {
    getCustomerInsights: vi.fn(async () => mockCustomerInsights),
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
import { GET } from "@/app/api/souq/analytics/customers/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq Analytics Customers API", () => {
  beforeEach(() => {
    mockSession = null;
    mockRateLimitResponse = null;
    mockCustomerInsights = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/souq/analytics/customers", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = null;
      const req = new NextRequest("http://localhost/api/souq/analytics/customers");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("should return 429 when rate limited", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockRateLimitResponse = new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 });
      const req = new NextRequest("http://localhost/api/souq/analytics/customers");
      const res = await GET(req);
      expect(res.status).toBe(429);
    });

    it("should reject requests without org context", async () => {
      mockSession = { user: { id: "user1", orgId: "", role: "seller" } };
      const req = new NextRequest("http://localhost/api/souq/analytics/customers");
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("should return customer insights", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockCustomerInsights = {
        newCustomers: 45,
        returningRate: 35.5,
        avgLTV: 450.00,
        topRegions: ["Riyadh", "Jeddah", "Dammam"],
        segments: { vip: 10, regular: 80, new: 45 },
      };
      const req = new NextRequest("http://localhost/api/souq/analytics/customers");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.newCustomers).toBe(45);
      expect(data.returningRate).toBe(35.5);
    });

    it("should accept period query parameter", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockCustomerInsights = {
        newCustomers: 15,
        returningRate: 40.0,
        period: "last_7_days",
      };
      const req = new NextRequest("http://localhost/api/souq/analytics/customers?period=last_7_days");
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });
});
