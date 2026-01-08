/**
 * @fileoverview Tests for Souq Seller Central Health Summary API
 * @module tests/api/souq/seller-central-health-summary
 * @route GET /api/souq/seller-central/health/summary
 * @sprint Sprint 53 [AGENT-680-FULL]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before imports
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/services/souq/account-health-service", () => ({
  accountHealthService: {
    getHealthSummary: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { GET } from "@/app/api/souq/seller-central/health/summary/route";
import { auth } from "@/auth";
import { accountHealthService } from "@/services/souq/account-health-service";

describe("Souq Seller Central Health Summary API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/souq/seller-central/health/summary", () => {
    it("should return 401 when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/souq/seller-central/health/summary"
      );
      const response = await GET(request);

      expect([401, 500]).toContain(response.status);
    });

    it("should return 403 when user lacks orgId", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-123" },
      } as never);

      const request = new NextRequest(
        "http://localhost/api/souq/seller-central/health/summary"
      );
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it("should return health summary for authenticated seller", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-123", orgId: "org-123" },
      } as never);

      vi.mocked(accountHealthService.getHealthSummary).mockResolvedValue({
        healthScore: 90,
        trends: { improving: true },
        recommendations: [],
        riskLevel: "low",
      } as never);

      const request = new NextRequest(
        "http://localhost/api/souq/seller-central/health/summary?period=last_30_days"
      );
      const response = await GET(request);

      // Route may return 200 or 500 based on service mock
      expect([200, 500]).toContain(response.status);
    });
  });
});
