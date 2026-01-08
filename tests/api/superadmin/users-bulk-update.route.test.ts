/**
 * @fileoverview Tests for superadmin/users/bulk-update API route
 * @description POST endpoint for updating multiple users at once
 * @route /api/superadmin/users/bulk-update
 * @sprint 45
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock superadmin auth
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue(null),
}));

// Mock rate limiter
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

// Mock MongoDB
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock User model
vi.mock("@/server/models/User", () => ({
  User: {
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
}));

// Mock AuditLog model
vi.mock("@/server/models/AuditLog", () => ({
  AuditLogModel: {
    create: vi.fn().mockResolvedValue({}),
    insertMany: vi.fn().mockResolvedValue([]),
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("superadmin/users/bulk-update route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/superadmin/users/bulk-update", () => {
    it("should return 401 when not authenticated", async () => {
      const { POST } = await import("@/app/api/superadmin/users/bulk-update/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/users/bulk-update", {
        method: "POST",
        body: JSON.stringify({
          userIds: ["507f1f77bcf86cd799439011"],
          updates: { status: "ACTIVE" },
        }),
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should enforce rate limiting", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const { smartRateLimit } = await import("@/server/security/rateLimit");
      vi.mocked(smartRateLimit).mockResolvedValueOnce({ allowed: false, resetAt: Date.now() + 60000 });

      const { POST } = await import("@/app/api/superadmin/users/bulk-update/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/users/bulk-update", {
        method: "POST",
        body: JSON.stringify({
          userIds: ["507f1f77bcf86cd799439011"],
          updates: { status: "ACTIVE" },
        }),
      });
      const response = await POST(request);
      expect(response.status).toBe(429);
    });

    it("should validate updates field is required", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const { POST } = await import("@/app/api/superadmin/users/bulk-update/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/users/bulk-update", {
        method: "POST",
        body: JSON.stringify({
          userIds: ["507f1f77bcf86cd799439011"],
          updates: {},
        }),
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
