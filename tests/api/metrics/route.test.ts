/**
 * @fileoverview Metrics API Tests
 * Tests for GET /api/metrics endpoint
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockRequireSuperAdmin = vi.fn();
const mockSmartRateLimit = vi.fn();
const mockGetMetricsRegistry = vi.fn();

vi.mock("@/lib/authz", () => ({
  requireSuperAdmin: (...args: unknown[]) => mockRequireSuperAdmin(...args),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: (...args: unknown[]) => mockSmartRateLimit(...args),
  buildOrgAwareRateLimitKey: vi.fn().mockReturnValue("org-123:user-123:/api/metrics"),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
  ),
}));

vi.mock("@/lib/monitoring/metrics-registry", () => ({
  getMetricsRegistry: () => mockGetMetricsRegistry(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Metrics API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock returns
    mockRequireSuperAdmin.mockResolvedValue({
      id: "admin-123",
      tenantId: "org-123",
    });
    mockSmartRateLimit.mockResolvedValue({ allowed: true, remaining: 59 });
    mockGetMetricsRegistry.mockReturnValue({
      metrics: vi.fn().mockResolvedValue("# HELP http_requests_total Total HTTP requests\nhttp_requests_total 100"),
      contentType: "text/plain; version=0.0.4; charset=utf-8",
    });
  });

  describe("GET /api/metrics", () => {
    it("should return metrics in Prometheus format for super admin", async () => {
      const { GET } = await import("@/app/api/metrics/route");
      const req = new NextRequest("http://localhost/api/metrics");

      const response = await GET(req);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/plain");
      expect(text).toContain("http_requests_total");
    });

    it("should return 401 for non-super-admin user", async () => {
      mockRequireSuperAdmin.mockRejectedValueOnce(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );

      const { GET } = await import("@/app/api/metrics/route");
      const req = new NextRequest("http://localhost/api/metrics");

      const response = await GET(req);

      expect(response.status).toBe(401);
    });

    it("should return 400 when missing organization context", async () => {
      mockRequireSuperAdmin.mockResolvedValueOnce({
        id: "admin-123",
        tenantId: null,
      });

      const { GET } = await import("@/app/api/metrics/route");
      const req = new NextRequest("http://localhost/api/metrics");

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing organization context");
    });

    it("should return 429 when rate limited", async () => {
      mockSmartRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0 });

      const { GET } = await import("@/app/api/metrics/route");
      const req = new NextRequest("http://localhost/api/metrics");

      const response = await GET(req);

      expect(response.status).toBe(429);
    });

    it("should set no-store cache control header", async () => {
      const { GET } = await import("@/app/api/metrics/route");
      const req = new NextRequest("http://localhost/api/metrics");

      const response = await GET(req);

      expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("should return 500 on registry error", async () => {
      mockGetMetricsRegistry.mockReturnValueOnce({
        metrics: vi.fn().mockRejectedValue(new Error("Registry error")),
        contentType: "text/plain",
      });

      const { GET } = await import("@/app/api/metrics/route");
      const req = new NextRequest("http://localhost/api/metrics");

      const response = await GET(req);

      expect(response.status).toBe(500);
    });
  });
});
