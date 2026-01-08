/**
 * @fileoverview Tests for Superadmin Check Cookie API
 * @route GET /api/superadmin/check-cookie
 * @agent [AGENT-001-A]
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies BEFORE importing the route
vi.mock("@/lib/superadmin/auth.edge", () => ({
  SUPERADMIN_COOKIE_NAME: "superadmin-token",
  decodeSuperadminToken: vi.fn(),
}));

// Dynamic imports AFTER mocks
const { GET } = await import("@/app/api/superadmin/check-cookie/route");
const { decodeSuperadminToken } = await import("@/lib/superadmin/auth.edge");

describe("Superadmin Check Cookie API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SUPERADMIN_JWT_SECRET", "test-secret");
  });

  describe("GET /api/superadmin/check-cookie", () => {
    it("should return cookie diagnostic info when no cookie present", async () => {
      const request = new NextRequest("http://localhost/api/superadmin/check-cookie");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.session.valid).toBe(false);
      expect(data.session.error).toBe("No cookie present");
    });

    it("should return valid session when cookie is valid", async () => {
      vi.mocked(decodeSuperadminToken).mockResolvedValue({
        username: "admin",
        role: "superadmin",
        orgId: "org-123456789",
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/check-cookie", {
        headers: {
          Cookie: "superadmin-token=valid-token",
        },
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.session.valid).toBe(true);
      expect(data.session.data.username).toBe("admin");
      expect(data.session.data.role).toBe("superadmin");
    });

    it("should return session error when token decode fails", async () => {
      vi.mocked(decodeSuperadminToken).mockRejectedValue(new Error("Invalid token"));

      const request = new NextRequest("http://localhost/api/superadmin/check-cookie", {
        headers: {
          Cookie: "superadmin-token=invalid-token",
        },
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.session.valid).toBe(false);
      expect(data.session.error).toBe("Invalid token");
    });

    it("should return session error when token decode returns null", async () => {
      vi.mocked(decodeSuperadminToken).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/check-cookie", {
        headers: {
          Cookie: "superadmin-token=expired-token",
        },
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.session.valid).toBe(false);
      expect(data.session.error).toContain("Token decode returned null");
    });

    it("should report JWT secret source info", async () => {
      vi.stubEnv("SUPERADMIN_JWT_SECRET", "test-secret");
      vi.mocked(decodeSuperadminToken).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/check-cookie", {
        headers: {
          Cookie: "superadmin-token=some-token",
        },
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.jwt).toBeDefined();
      expect(data.jwt.hasSecret).toBe(true);
    });

    it("should mask orgId in response for security", async () => {
      vi.mocked(decodeSuperadminToken).mockResolvedValue({
        username: "admin",
        role: "superadmin",
        orgId: "org-123456789abcdef",
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/check-cookie", {
        headers: {
          Cookie: "superadmin-token=valid-token",
        },
      });
      const response = await GET(request);

      const data = await response.json();
      expect(data.session.valid).toBe(true);
      expect(data.session.data.orgId).toBe("org-...");
    });
  });
});
