/**
 * @fileoverview Tests for admin security rate-limits endpoint
 * @route GET /api/admin/security/rate-limits
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
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

const { GET } = await import("@/app/api/admin/security/rate-limits/route");
const { auth } = await import("@/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

describe("Admin Security Rate Limits API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin", role: "SUPER_ADMIN" },
    } as any);
  });

  describe("GET /api/admin/security/rate-limits", () => {
    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/admin/security/rate-limits");

      const response = await GET(request);
      expect(response.status).toBe(429);
    });

    it("should return 401 if no session", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/security/rate-limits");

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return 403 if not admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user", role: "USER" },
      } as any);

      const request = new NextRequest("http://localhost/api/admin/security/rate-limits");

      const response = await GET(request);
      expect(response.status).toBe(403);
    });
  });
});
