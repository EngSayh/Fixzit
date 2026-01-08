/**
 * @fileoverview Tests for superadmin login endpoint
 * @route POST /api/superadmin/login
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/superadmin/auth", () => ({
  applySuperadminCookies: vi.fn(),
  isIpAllowed: vi.fn(),
  isRateLimited: vi.fn(),
  signSuperadminToken: vi.fn(),
  validateSecondFactor: vi.fn(),
  verifySuperadminPassword: vi.fn(),
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { POST } = await import("@/app/api/superadmin/login/route");
const { isIpAllowed, isRateLimited, verifySuperadminPassword, signSuperadminToken, applySuperadminCookies } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

describe("Superadmin Login API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SUPERADMIN_USERNAME", "admin");
    vi.stubEnv("SUPERADMIN_PASSWORD_HASH", "hashed");
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(isIpAllowed).mockReturnValue(true);
    vi.mocked(isRateLimited).mockReturnValue(false);
  });

  describe("POST /api/superadmin/login", () => {
    it("should return 403 if IP not allowed", async () => {
      vi.mocked(isIpAllowed).mockReturnValue(false);

      const request = new NextRequest("http://localhost/api/superadmin/login", {
        method: "POST",
        body: JSON.stringify({ username: "admin", password: "pass" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it("should return 429 if rate limited (in-memory)", async () => {
      vi.mocked(isRateLimited).mockReturnValue(true);

      const request = new NextRequest("http://localhost/api/superadmin/login", {
        method: "POST",
        body: JSON.stringify({ username: "admin", password: "pass" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
    });

    it("should return 400 if username missing", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/login", {
        method: "POST",
        body: JSON.stringify({ password: "pass" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("MISSING_USERNAME");
    });

    it("should return 400 if password missing", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/login", {
        method: "POST",
        body: JSON.stringify({ username: "admin" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("MISSING_PASSWORD");
    });

    it("should return 429 when middleware rate limited", async () => {
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
      );

      const request = new NextRequest("http://localhost/api/superadmin/login", {
        method: "POST",
        body: JSON.stringify({ username: "admin", password: "pass" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
    });
  });
});
