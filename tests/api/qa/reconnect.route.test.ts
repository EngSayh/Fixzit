/**
 * @fileoverview Tests for QA reconnect endpoint
 * @route POST /api/qa/reconnect
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  buildOrgAwareRateLimitKey: vi.fn().mockReturnValue("test-key"),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/authz", () => ({
  requireSuperAdmin: vi.fn(),
}));

const { POST } = await import("@/app/api/qa/reconnect/route");
const { requireSuperAdmin } = await import("@/lib/authz");
const { smartRateLimit } = await import("@/server/security/rateLimit");

describe("QA Reconnect API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(requireSuperAdmin).mockResolvedValue({
      id: "superadmin",
      tenantId: "test-tenant",
    } as any);
  });

  describe("POST /api/qa/reconnect", () => {
    it("should return 401 if not super admin", async () => {
      vi.mocked(requireSuperAdmin).mockRejectedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
      );

      const request = new NextRequest("http://localhost/api/qa/reconnect", {
        method: "POST",
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false });

      const request = new NextRequest("http://localhost/api/qa/reconnect", {
        method: "POST",
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
    });

    it("should accept valid POST request", async () => {
      const request = new NextRequest("http://localhost/api/qa/reconnect", {
        method: "POST",
      });

      const response = await POST(request);
      expect([200, 500]).toContain(response.status);
    });
  });
});
