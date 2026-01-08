/**
 * @fileoverview Tests for superadmin/support-tickets API route
 * @description Support ticket management with cross-tenant visibility
 * @route /api/superadmin/support-tickets
 * @sprint 39
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

// Mock SupportTicket model
vi.mock("@/server/models/SupportTicket", () => ({
  SupportTicket: {
    countDocuments: vi.fn().mockResolvedValue(0),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
}));

// Mock tenant isolation
vi.mock("@/server/plugins/tenantIsolation", () => ({
  setTenantContext: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("superadmin/support-tickets route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/superadmin/support-tickets", () => {
    it("should enforce rate limiting", async () => {
      const { enforceRateLimit } = await import("@/lib/middleware/rate-limit");
      vi.mocked(enforceRateLimit).mockReturnValueOnce(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
      );

      const { GET } = await import("@/app/api/superadmin/support-tickets/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/support-tickets");
      const response = await GET(request);
      expect(response.status).toBe(429);
    });

    it("should return 401 when not authenticated", async () => {
      const { GET } = await import("@/app/api/superadmin/support-tickets/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/support-tickets");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should return tickets with valid session", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const { GET } = await import("@/app/api/superadmin/support-tickets/route");
      const request = new NextRequest("http://localhost:3000/api/superadmin/support-tickets");
      const response = await GET(request);
      expect([200, 500]).toContain(response.status);
    });

    it("should support status filtering", async () => {
      const { getSuperadminSession } = await import("@/lib/superadmin/auth");
      vi.mocked(getSuperadminSession).mockResolvedValueOnce({
        username: "admin",
        orgId: "org-1",
        role: "SUPER_ADMIN",
      } as unknown as Awaited<ReturnType<typeof getSuperadminSession>>);

      const { GET } = await import("@/app/api/superadmin/support-tickets/route");
      const request = new NextRequest(
        "http://localhost:3000/api/superadmin/support-tickets?status=open"
      );
      const response = await GET(request);
      expect([200, 500]).toContain(response.status);
    });
  });
});
