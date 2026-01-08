/**
 * @fileoverview Tests for superadmin/impersonate/status API route
 * @description GET endpoint to check if impersonation context is active
 * @route /api/superadmin/impersonate/status
 * @sprint 43
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/superadmin/impersonate/status/route";

// Mock superadmin auth
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue(null),
}));

describe("superadmin/impersonate/status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/superadmin/impersonate/status", () => {
    it("should return 401 when not authenticated", async () => {
      const request = new NextRequest("http://localhost:3000/api/superadmin/impersonate/status");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return status with valid session", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const request = new NextRequest("http://localhost:3000/api/superadmin/impersonate/status");
      const response = await GET(request);
      expect(response.status).toBe(200);
      
      const json = await response.json();
      expect(json).toHaveProperty("success", true);
      expect(json).toHaveProperty("active");
    });
  });
});
