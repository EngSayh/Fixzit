/**
 * @fileoverview Tests for superadmin logout endpoint
 * @route POST,GET /api/superadmin/logout
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/superadmin/auth", () => ({
  clearSuperadminCookies: vi.fn(),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

const { POST, GET } = await import("@/app/api/superadmin/logout/route");
const { clearSuperadminCookies } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

describe("Superadmin Logout API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  describe("POST /api/superadmin/logout", () => {
    it("should return success and clear cookies", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/logout", {
        method: "POST",
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(clearSuperadminCookies).toHaveBeenCalled();
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/superadmin/logout", {
        method: "POST",
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
    });
  });

  describe("GET /api/superadmin/logout", () => {
    it("should also log out (for simple logout links)", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/logout");

      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
