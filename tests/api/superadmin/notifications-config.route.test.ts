/**
 * @fileoverview Tests for superadmin/notifications/config API route
 * @description Returns notification service configuration status
 * @route /api/superadmin/notifications/config
 * @sprint 44
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/superadmin/notifications/config/route";

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

describe("superadmin/notifications/config route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/superadmin/notifications/config", () => {
    it("should return 401 when not authenticated", async () => {
      const request = new NextRequest("http://localhost:3000/api/superadmin/notifications/config");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return config with valid session", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const request = new NextRequest("http://localhost:3000/api/superadmin/notifications/config");
      const response = await GET(request);
      expect(response.status).toBe(200);
      
      const json = await response.json();
      expect(json).toHaveProperty("success", true);
      expect(json).toHaveProperty("config");
    });
  });
});
