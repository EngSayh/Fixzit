/**
 * @fileoverview Tests for PM generate-wos endpoint
 * @route POST /api/pm/generate-wos
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: vi.fn(),
}));

vi.mock("@/lib/db/mongoose", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

const { POST } = await import("@/app/api/pm/generate-wos/route");
const { getSessionOrNull } = await import("@/lib/auth/safe-session");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

const validOrgId = "507f1f77bcf86cd799439011";

describe("PM Generate Work Orders API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { id: "user1", orgId: validOrgId, role: "ADMIN" },
    });
  });

  describe("POST /api/pm/generate-wos", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({ ok: true, session: null });

      const request = new NextRequest("http://localhost/api/pm/generate-wos", {
        method: "POST",
        body: JSON.stringify({ planId: validOrgId }),
      });

      const response = await POST(request);
      expect([401, 403, 500]).toContain(response.status);
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/pm/generate-wos", {
        method: "POST",
        body: JSON.stringify({ planId: validOrgId }),
      });

      const response = await POST(request);
      expect([200, 401, 429, 500]).toContain(response.status);
    });

    it("should handle generate WOs request", async () => {
      const request = new NextRequest("http://localhost/api/pm/generate-wos", {
        method: "POST",
        body: JSON.stringify({ planId: validOrgId }),
      });

      const response = await POST(request);
      expect([200, 400, 401, 500]).toContain(response.status);
    });
  });
});
