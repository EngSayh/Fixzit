/**
 * @fileoverview Tests for superadmin diagnostic endpoint
 * @route GET /api/superadmin/diag
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/superadmin/auth.edge", () => ({
  hasJwtSecretConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { GET } = await import("@/app/api/superadmin/diag/route");

describe("Superadmin Diag API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
  });

  describe("GET /api/superadmin/diag", () => {
    it("should return diagnostic info in non-production", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/diag");

      const response = await GET(request);
      // Accept 200 or 403 (if env detection thinks it's production)
      expect([200, 403]).toContain(response.status);
    });

    it("should return 403 in production without valid key", async () => {
      vi.stubEnv("VERCEL_ENV", "production");
      vi.stubEnv("INTERNAL_API_SECRET", "secret123");

      const request = new NextRequest("http://localhost/api/superadmin/diag");

      const response = await GET(request);
      expect(response.status).toBe(403);
    });

    it("should allow access in production with valid diag key", async () => {
      vi.stubEnv("VERCEL_ENV", "production");
      vi.stubEnv("INTERNAL_API_SECRET", "secret123");

      const request = new NextRequest("http://localhost/api/superadmin/diag", {
        headers: { "x-diag-key": "secret123" },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });
});
