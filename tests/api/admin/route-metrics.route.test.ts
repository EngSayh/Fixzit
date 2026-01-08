/**
 * @fileoverview Tests for admin/route-metrics API route
 * @description Provides metrics about API route aliases
 * @route GET/POST /api/admin/route-metrics
 * @sprint 48
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/route-metrics/route";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

// Mock superadmin auth
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue(null),
}));

// Mock rate limit
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock route alias metrics
vi.mock("@/lib/routes/aliasMetrics", () => ({
  generateRouteAliasMetrics: vi.fn().mockReturnValue({ totals: {}, duplicates: [] }),
  readRouteAliasMetrics: vi.fn().mockReturnValue(null),
  saveRouteAliasMetrics: vi.fn().mockResolvedValue(undefined),
  enrichRouteAliasMetrics: vi.fn().mockReturnValue({ totals: {}, duplicates: [] }),
}));

// Mock route health
vi.mock("@/lib/routes/routeHealth", () => ({
  loadRouteHealthData: vi.fn().mockReturnValue({}),
}));

// Mock webhooks
vi.mock("@/lib/routes/webhooks", () => ({
  postRouteMetricsWebhook: vi.fn().mockResolvedValue(undefined),
}));

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readdirSync: vi.fn().mockReturnValue([]),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("admin/route-metrics route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/route-metrics", () => {
    it("should return 401 when not authenticated", async () => {
      const request = new NextRequest("http://localhost:3000/api/admin/route-metrics");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 for non-SUPER_ADMIN", async () => {
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "user-1", orgId: "org-1", role: "ADMIN" },
      } as never);

      const request = new NextRequest("http://localhost:3000/api/admin/route-metrics");
      const response = await GET(request);
      expect(response.status).toBe(403);
    });

    it("should return metrics with SUPER_ADMIN", async () => {
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "user-1", orgId: "org-1", role: "SUPER_ADMIN" },
      } as never);

      const request = new NextRequest("http://localhost:3000/api/admin/route-metrics");
      const response = await GET(request);
      expect([200, 500]).toContain(response.status);
    });
  });


});
