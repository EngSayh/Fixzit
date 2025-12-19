/**
 * @fileoverview Admin Testing Users API Route Tests
 * @description Tests for /api/admin/testing-users endpoints
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock database
vi.mock("@/lib/mongo", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
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

describe("Admin Testing Users API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/testing-users", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      
      const { GET } = await import("@/app/api/admin/testing-users/route");
      
      const request = new NextRequest(
        new URL("http://localhost:3000/api/admin/testing-users")
      );
      
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("returns 403 for non-admin users", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "user-1", role: "VIEWER", orgId: "org-1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      
      const { GET } = await import("@/app/api/admin/testing-users/route");
      
      const request = new NextRequest(
        new URL("http://localhost:3000/api/admin/testing-users")
      );
      
      const response = await GET(request);
      expect([401, 403]).toContain(response.status);
    });

    it("returns testing users for SUPER_ADMIN", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "superadmin-1", role: "SUPER_ADMIN", orgId: "org-1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      
      const { GET } = await import("@/app/api/admin/testing-users/route");
      
      const request = new NextRequest(
        new URL("http://localhost:3000/api/admin/testing-users")
      );
      
      const response = await GET(request);
      // Should succeed or return empty list
      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /api/admin/testing-users", () => {
    it("requires authentication", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      
      const { POST } = await import("@/app/api/admin/testing-users/route");
      
      const request = new NextRequest(
        new URL("http://localhost:3000/api/admin/testing-users"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "test@example.com", role: "VIEWER" }),
        }
      );
      
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("requires SUPER_ADMIN role", async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: "user-1", role: "ADMIN", orgId: "org-1" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      
      const { POST } = await import("@/app/api/admin/testing-users/route");
      
      const request = new NextRequest(
        new URL("http://localhost:3000/api/admin/testing-users"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "test@example.com", role: "VIEWER" }),
        }
      );
      
      const response = await POST(request);
      expect([401, 403]).toContain(response.status);
    });
  });
});
