/**
 * @fileoverview Tests for superadmin security rate-limits endpoint
 * @route GET /api/superadmin/security/rate-limits
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

vi.mock("@/lib/security/monitoring", () => ({
  getSecurityMetrics: vi.fn().mockReturnValue({
    windowMs: 60000,
    rateLimitHits: 100,
    rateLimitUniqueKeys: 50,
  }),
  getRateLimitBreakdown: vi.fn().mockReturnValue({}),
}));

vi.mock("@/server/security/rateLimit", () => ({
  getRateLimitMetrics: vi.fn().mockReturnValue({}),
}));

const { GET } = await import("@/app/api/superadmin/security/rate-limits/route");
const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

describe("Superadmin Security Rate Limits API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
    } as any);
  });

  describe("GET /api/superadmin/security/rate-limits", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/security/rate-limits");

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return rate limit metrics", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/security/rate-limits");

      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("windowMs");
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/superadmin/security/rate-limits");

      const response = await GET(request);
      expect(response.status).toBe(429);
    });
  });
});
