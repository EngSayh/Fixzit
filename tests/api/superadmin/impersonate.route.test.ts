/**
 * Superadmin Impersonation API Tests
 * Tests for POST/DELETE /api/superadmin/impersonate
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST, DELETE } from "@/app/api/superadmin/impersonate/route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null), // Default: no rate limit
}));

const { getSuperadminSession } = await import("@/lib/superadmin/auth");
const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");

describe("Superadmin Impersonation API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset rate limit mock to default (not triggered)
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  describe("POST /api/superadmin/impersonate", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/impersonate", {
        method: "POST",
        body: JSON.stringify({ orgId: "org_test123" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain("Unauthorized");
    });

    it("should return 400 for invalid JSON body", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/impersonate", {
        method: "POST",
        body: "invalid-json",
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Invalid JSON");
    });

    it("should return 400 for missing orgId", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/Organization ID|expected string/i);
    });

    it("should set support_org_id cookie and return success", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: "org_abc123" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.orgId).toBe("org_abc123");

      // Check cookie was set
      const setCookieHeader = response.headers.get("set-cookie");
      expect(setCookieHeader).toContain("support_org_id=org_abc123");
      expect(setCookieHeader).toContain("HttpOnly");
    });
  });

  describe("DELETE /api/superadmin/impersonate", () => {
    it("should return 401 if no superadmin session", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/superadmin/impersonate", {
        method: "DELETE",
      });

      const response = await DELETE(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain("Unauthorized");
    });

    it("should clear support_org_id cookie and return success", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);

      const request = new NextRequest("http://localhost/api/superadmin/impersonate", {
        method: "DELETE",
      });

      const response = await DELETE(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Check cookie was cleared (set-cookie with Max-Age=0 or Expires in past)
      const setCookieHeader = response.headers.get("set-cookie");
      expect(setCookieHeader).toContain("support_org_id");
    });
  });

  describe("Rate Limiting", () => {
    it("should return 429 when rate limit exceeded on POST", async () => {
      vi.mocked(getSuperadminSession).mockResolvedValue({
        username: "superadmin",
        role: "superadmin",
      } as any);

      // Mock rate limit exceeded
      const rateLimitResponse = new Response(
        JSON.stringify({ error: "Too many requests" }),
        { status: 429, headers: { "Retry-After": "60" } }
      );
      vi.mocked(enforceRateLimit).mockReturnValueOnce(rateLimitResponse as any);

      const request = new NextRequest("http://localhost/api/superadmin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: "org_abc123" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(429);
      expect(enforceRateLimit).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          keyPrefix: "superadmin:impersonate:superadmin",
          requests: 10,
          windowMs: 60_000,
        })
      );
    });
  });
});
