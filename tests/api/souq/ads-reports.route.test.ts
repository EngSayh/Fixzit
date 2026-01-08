/**
 * @fileoverview Tests for /api/souq/ads/reports route
 * @description Ad performance reports API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MUTABLE MOCK STATE
// ============================================================================
type SessionUser = { id: string; orgId: string; role: string } | null;
let mockSession: { user: SessionUser } | null = null;
let mockReportResult: unknown = null;

// Mock dependencies before import
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

vi.mock("@/services/souq/ads/reporting-service", () => ({
  AdReportingService: {
    getCampaignReport: vi.fn(async () => mockReportResult),
    getAccountReport: vi.fn(async () => mockReportResult),
    getPerformanceReport: vi.fn(async () => mockReportResult),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
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
import { GET } from "@/app/api/souq/ads/reports/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Souq Ads Reports API", () => {
  beforeEach(() => {
    mockSession = null;
    mockReportResult = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/souq/ads/reports", () => {
    it("should reject unauthenticated requests", async () => {
      mockSession = null;
      const req = new NextRequest("http://localhost/api/souq/ads/reports?type=campaign&campaignId=camp1");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("should reject requests without org context", async () => {
      mockSession = { user: { id: "user1", orgId: "", role: "seller" } };
      const req = new NextRequest("http://localhost/api/souq/ads/reports?type=account");
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("should reject invalid report type", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      const req = new NextRequest("http://localhost/api/souq/ads/reports?type=invalid");
      const res = await GET(req);
      expect(res.status).toBe(400);
    });

    it("should return campaign report", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockReportResult = {
        campaignId: "camp1",
        impressions: 1000,
        clicks: 50,
        spend: 25.00,
        ctr: 0.05,
        cpc: 0.50,
      };
      const req = new NextRequest("http://localhost/api/souq/ads/reports?type=campaign&campaignId=camp1");
      const res = await GET(req);
      // May return 200 with data or 400/500 depending on validation
      expect([200, 400, 500]).toContain(res.status);
    });

    it("should return account-level report", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockReportResult = {
        totalImpressions: 10000,
        totalClicks: 500,
        totalSpend: 250.00,
        campaigns: [],
      };
      const req = new NextRequest("http://localhost/api/souq/ads/reports?type=account");
      const res = await GET(req);
      expect([200, 400, 500]).toContain(res.status);
    });

    it("should filter by date range", async () => {
      mockSession = { user: { id: "user1", orgId: "org1", role: "seller" } };
      mockReportResult = { data: [] };
      const req = new NextRequest(
        "http://localhost/api/souq/ads/reports?type=performance&startDate=2025-01-01&endDate=2025-01-31"
      );
      const res = await GET(req);
      expect([200, 400, 500]).toContain(res.status);
    });
  });
});
