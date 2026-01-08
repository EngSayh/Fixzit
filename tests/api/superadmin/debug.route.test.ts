/**
 * @fileoverview Tests for superadmin debug endpoint
 * @route GET /api/superadmin/debug
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
  SUPERADMIN_COOKIE_NAME: "superadmin_session",
  isIpAllowed: vi.fn(),
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

const { GET } = await import("@/app/api/superadmin/debug/route");
const { getSuperadminSession, isIpAllowed } = await import("@/lib/superadmin/auth");

describe("Superadmin Debug API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    vi.mocked(isIpAllowed).mockReturnValue(true);
    vi.mocked(getSuperadminSession).mockResolvedValue({
      username: "superadmin",
      role: "superadmin",
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    } as any);
  });

  describe("GET /api/superadmin/debug", () => {
    it("should return diagnostics in non-production mode", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/debug");

      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("cookies");
      expect(data).toHaveProperty("session");
    });

    it("should return 403 in production without IP allowlist", async () => {
      vi.stubEnv("VERCEL_ENV", "production");
      vi.stubEnv("SUPERADMIN_IP_ALLOWLIST", "");

      const request = new NextRequest("http://localhost/api/superadmin/debug");

      const response = await GET(request);
      expect(response.status).toBe(403);
    });

    it("should return 403 in production with invalid IP", async () => {
      vi.stubEnv("VERCEL_ENV", "production");
      vi.stubEnv("SUPERADMIN_IP_ALLOWLIST", "10.0.0.1");
      vi.mocked(isIpAllowed).mockReturnValue(false);

      const request = new NextRequest("http://localhost/api/superadmin/debug");

      const response = await GET(request);
      expect(response.status).toBe(403);
    });
  });
});
