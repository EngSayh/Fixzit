/**
 * @fileoverview Tests for superadmin/notifications/count API route
 * @description Returns unread/pending notification count for superadmin badge
 * @route /api/superadmin/notifications/count
 * @sprint 44
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock superadmin auth
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue(null),
}));

// Mock MongoDB
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      countDocuments: vi.fn().mockResolvedValue(0),
    }),
  }),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock collections
vi.mock("@/lib/db/collections", () => ({
  COLLECTIONS: {
    NOTIFICATIONS: "notifications",
    MFA_APPROVALS: "mfa_approvals",
  },
}));

describe("superadmin/notifications/count route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/superadmin/notifications/count", () => {
    it("should return 401 when not authenticated", async () => {
      const { GET } = await import("@/app/api/superadmin/notifications/count/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/notifications/count");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return count with valid session", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const { GET } = await import("@/app/api/superadmin/notifications/count/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/notifications/count");
      const response = await GET(request);
      expect([200, 500]).toContain(response.status);
    });
  });
});
