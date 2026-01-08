/**
 * @fileoverview Tests for superadmin/notifications/test API route
 * @description Tests a notification channel (superadmin)
 * @route /api/superadmin/notifications/test
 * @sprint 44
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock superadmin auth
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue(null),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("superadmin/notifications/test route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/superadmin/notifications/test", () => {
    it("should return 401 when not authenticated", async () => {
      const { POST } = await import("@/app/api/superadmin/notifications/test/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/notifications/test", {
        method: "POST",
        body: JSON.stringify({ channel: "email" }),
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should return 400 for missing channel", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const { POST } = await import("@/app/api/superadmin/notifications/test/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/notifications/test", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid channel", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const { POST } = await import("@/app/api/superadmin/notifications/test/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/notifications/test", {
        method: "POST",
        body: JSON.stringify({ channel: "invalid_channel" }),
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
