/**
 * @fileoverview Tests for superadmin/audit/export API route
 * @description Export audit logs
 * @route /api/superadmin/audit/export
 * @sprint 46
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/superadmin/audit/export/route";

// Mock superadmin auth
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue(null),
}));

// Mock rate limit
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock MongoDB
vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock AuditLog model
vi.mock("@/server/models/AuditLog", () => ({
  AuditLogModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
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

describe("superadmin/audit/export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/superadmin/audit/export", () => {
    it("should return 401 when not authenticated", async () => {
      const request = new NextRequest("http://localhost:3000/api/superadmin/audit/export");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should export logs with valid session", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const request = new NextRequest("http://localhost:3000/api/superadmin/audit/export");
      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });
});
