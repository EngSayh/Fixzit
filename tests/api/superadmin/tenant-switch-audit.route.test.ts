/**
 * @fileoverview Tests for SuperAdmin Tenant-Switch Audit API
 * @module tests/api/superadmin/tenant-switch-audit.route.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/superadmin/tenant-switch/audit/route";

// Mock dependencies
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockEnforceRateLimit = vi.fn();
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

const mockGetSuperadminSession = vi.fn();
const mockGetClientIp = vi.fn();
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: (...args: unknown[]) => mockGetSuperadminSession(...args),
  getClientIp: (...args: unknown[]) => mockGetClientIp(...args),
}));

const mockAudit = vi.fn();
vi.mock("@/lib/audit", () => ({
  audit: (...args: unknown[]) => mockAudit(...args),
}));

function createRequest(body?: Record<string, unknown>): NextRequest {
  const url = new URL("http://localhost:3000/api/superadmin/tenant-switch/audit");
  return new NextRequest(url, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("SuperAdmin Tenant-Switch Audit API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockResolvedValue(null);
    mockGetSuperadminSession.mockReset();
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockAudit.mockResolvedValue(undefined);
  });

  describe("POST /api/superadmin/tenant-switch/audit", () => {
    it("should return 429 when rate limited", async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: "Too many requests" }),
        { status: 429 }
      );
      mockEnforceRateLimit.mockResolvedValue(rateLimitResponse);

      const request = createRequest({ target: "org-123" });
      const response = await POST(request);
      
      expect(response.status).toBe(429);
    });

    it("should return 401 when not authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);

      const request = createRequest({ target: "org-123" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should record audit and return success when authenticated", async () => {
      const session = {
        username: "superadmin",
        role: "superadmin",
        orgId: "org_admin",
      };
      mockGetSuperadminSession.mockResolvedValue(session);

      const request = createRequest({ target: "org-123", via: "header" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: "superadmin",
          action: "superadmin.tenant.switchShortcut",
          target: "org-123",
        })
      );
    });

    it("should use default target when not provided", async () => {
      const session = {
        username: "superadmin",
        role: "superadmin",
        orgId: "org_admin",
      };
      mockGetSuperadminSession.mockResolvedValue(session);

      const request = createRequest({}); // No target
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          target: "switch-tenant", // Default value
        })
      );
    });

    it("should return 500 when audit fails", async () => {
      const session = {
        username: "superadmin",
        role: "superadmin",
        orgId: "org_admin",
      };
      mockGetSuperadminSession.mockResolvedValue(session);
      mockAudit.mockRejectedValue(new Error("DB error"));

      const request = createRequest({ target: "org-123" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Audit failed");
    });

    it("should handle malformed JSON body gracefully", async () => {
      const session = {
        username: "superadmin",
        role: "superadmin",
        orgId: "org_admin",
      };
      mockGetSuperadminSession.mockResolvedValue(session);

      const url = new URL("http://localhost:3000/api/superadmin/tenant-switch/audit");
      const request = new NextRequest(url, {
        method: "POST",
        body: "invalid-json",
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      // Should handle gracefully with default target
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
