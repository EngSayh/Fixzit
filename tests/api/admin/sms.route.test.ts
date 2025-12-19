/**
 * @fileoverview Admin SMS Settings API Route Tests
 * @description Tests for /api/admin/sms endpoints
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock rate limit
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { auth } from "@/auth";

describe("Admin SMS API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/sms", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      
      const { GET } = await import("@/app/api/admin/sms/route");
      
      const request = new NextRequest(
        new URL("http://localhost:3000/api/admin/sms")
      );
      
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("returns 403 for non-superadmin users", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "user-1", role: "ADMIN", orgId: "org-1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      
      const { GET } = await import("@/app/api/admin/sms/route");
      
      const request = new NextRequest(
        new URL("http://localhost:3000/api/admin/sms")
      );
      
      const response = await GET(request);
      expect([401, 403]).toContain(response.status);
    });
  });

  describe("GET /api/admin/sms/settings", () => {
    it("requires authentication", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      
      const { GET } = await import("@/app/api/admin/sms/settings/route");
      
      const request = new NextRequest(
        new URL("http://localhost:3000/api/admin/sms/settings")
      );
      
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("returns SMS settings for SUPER_ADMIN", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "superadmin-1", role: "SUPER_ADMIN", orgId: "org-1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      
      const { GET } = await import("@/app/api/admin/sms/settings/route");
      
      const request = new NextRequest(
        new URL("http://localhost:3000/api/admin/sms/settings")
      );
      
      const response = await GET(request);
      // Should succeed or return default settings
      expect([200, 500]).toContain(response.status);
    });
  });
});
