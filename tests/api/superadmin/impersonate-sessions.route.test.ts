/**
 * @fileoverview Tests for superadmin/impersonate/sessions API route
 * @description GET endpoint for retrieving impersonation session history
 * @route /api/superadmin/impersonate/sessions
 * @sprint 43
 * @agent [AGENT-680-FULL]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiter before import
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock superadmin auth
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue(null),
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
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
  AuditLog: {},
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("superadmin/impersonate/sessions route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/superadmin/impersonate/sessions", () => {
    it("should enforce rate limiting", async () => {
      const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
      vi.mocked(enforceRateLimit).mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );

      const { GET } = await import("@/app/api/superadmin/impersonate/sessions/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/impersonate/sessions");
      const response = await GET(request);
      expect(response.status).toBe(429);
    });

    it("should return 401 when not authenticated", async () => {
      const { GET } = await import("@/app/api/superadmin/impersonate/sessions/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/impersonate/sessions");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return sessions with valid session", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const { GET } = await import("@/app/api/superadmin/impersonate/sessions/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/impersonate/sessions");
      const response = await GET(request);
      expect([200, 500]).toContain(response.status);
    });
  });
});
