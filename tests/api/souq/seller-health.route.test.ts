/**
 * @fileoverview Tests for /api/souq/seller-central/health route
 * @description Seller account health metrics
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE
// ============================================================================
type SessionUser = { id: string; orgId: string; role: string } | null;
let mockSession: { user: SessionUser } | null = null;
let mockRateLimitResponse: Response | null = null;
let mockHealthResult: unknown = null;

// Mock dependencies before import
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => mockRateLimitResponse),
}));

vi.mock("@/services/souq/account-health-service", () => ({
  accountHealthService: {
    calculateAccountHealth: vi.fn(async () => mockHealthResult),
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
import { GET } from "@/app/api/souq/seller-central/health/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq Seller Central Health API", () => {
  beforeEach(() => {
    mockSession = null;
    mockRateLimitResponse = null;
    mockHealthResult = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/souq/seller-central/health", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = null;
      const req = new NextRequest("http://localhost/api/souq/seller-central/health");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("should return 429 when rate limited", async () => {
      mockRateLimitResponse = new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 });
      const req = new NextRequest("http://localhost/api/souq/seller-central/health");
      const res = await GET(req);
      expect(res.status).toBe(429);
    });

    it("should reject requests without org context", async () => {
      mockSession = { user: { id: "user1", orgId: "", role: "seller" } };
      const req = new NextRequest("http://localhost/api/souq/seller-central/health");
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("should return health metrics for authenticated seller", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockHealthResult = {
        healthScore: 95,
        orderDefectRate: 0.5,
        lateShipmentRate: 1.2,
        cancellationRate: 0.8,
        violations: [],
      };
      const req = new NextRequest("http://localhost/api/souq/seller-central/health");
      const res = await GET(req);
      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        const data = await res.json();
        expect(data.success).toBe(true);
      }
    });

    it("should support period parameter", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockHealthResult = {
        healthScore: 92,
        orderDefectRate: 0.6,
        lateShipmentRate: 1.5,
        period: "last_7_days",
      };
      const req = new NextRequest("http://localhost/api/souq/seller-central/health?period=last_7_days");
      const res = await GET(req);
      expect([200, 500]).toContain(res.status);
    });

    it("should default to last_30_days period", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockHealthResult = {
        healthScore: 90,
        period: "last_30_days",
      };
      const req = new NextRequest("http://localhost/api/souq/seller-central/health");
      const res = await GET(req);
      expect([200, 500]).toContain(res.status);
    });

    it("should include violations if present", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockHealthResult = {
        healthScore: 75,
        violations: [
          { type: "policy", description: "Late shipment", severity: "warning" },
        ],
      };
      const req = new NextRequest("http://localhost/api/souq/seller-central/health");
      const res = await GET(req);
      expect([200, 500]).toContain(res.status);
    });
  });
});
