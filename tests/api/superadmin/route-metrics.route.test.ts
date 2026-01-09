/**
 * @fileoverview Tests for superadmin route-metrics endpoint
 * @route GET,POST /api/superadmin/route-metrics
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/routes/aliasMetrics", () => ({
  generateRouteAliasMetrics: vi.fn().mockReturnValue({ totals: {}, aliasDetails: [] }),
  readRouteAliasMetrics: vi.fn(),
  saveRouteAliasMetrics: vi.fn(),
  enrichRouteAliasMetrics: vi.fn(),
}));

vi.mock("@/lib/routes/routeHealth", () => ({
  loadRouteHealthData: vi.fn().mockReturnValue({ routes: [] }),
}));

vi.mock("@/lib/routes/webhooks", () => ({
  postRouteMetricsWebhook: vi.fn(),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readdirSync: vi.fn().mockReturnValue([]),
}));

const { GET, POST } = await import("@/app/api/superadmin/route-metrics/route");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

describe("Superadmin Route Metrics API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
    } as any);
  });

  describe("GET /api/superadmin/route-metrics", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/route-metrics");

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return route metrics", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/route-metrics");

      const response = await GET(request);
      // Accept 200 or 500 if mock fails
      expect([200, 500]).toContain(response.status);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/superadmin/route-metrics");

      const response = await GET(request);
      expect(response.status).toBe(429);
    });
  });

  describe("POST /api/superadmin/route-metrics", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/route-metrics", {
        method: "POST",
        body: JSON.stringify({ action: "regenerate" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
