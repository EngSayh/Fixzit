/**
 * @fileoverview Tests for /api/support/tickets/my route
 * @description User's own tickets listing API
 * Sprint 64: Support domain coverage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));

vi.mock("@/server/security/rateLimitKey", () => ({
  buildOrgAwareRateLimitKey: vi.fn().mockReturnValue("test-key"),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/server/models/SupportTicket", () => ({
  SupportTicket: {
    find: vi.fn(),
  },
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((body, status) => 
    new Response(JSON.stringify(body), { status })
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { SupportTicket } from "@/server/models/SupportTicket";
import { GET } from "@/app/api/support/tickets/my/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Support My Tickets API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/support/tickets/my", () => {
    it("should reject unauthenticated requests", async () => {
      vi.mocked(getSessionUser).mockRejectedValue(new Error("Unauthorized"));

      const req = new NextRequest("http://localhost/api/support/tickets/my", { method: "GET" });
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("should return empty list for user with no tickets", async () => {
      vi.mocked(getSessionUser).mockResolvedValue({
        id: "user1",
        role: "USER",
        orgId: "org1",
      });
      vi.mocked(SupportTicket.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      });

      const req = new NextRequest("http://localhost/api/support/tickets/my", { method: "GET" });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.items).toEqual([]);
    });

    it("should return user tickets", async () => {
      vi.mocked(getSessionUser).mockResolvedValue({
        id: "user1",
        role: "USER",
        orgId: "org1",
      });
      vi.mocked(SupportTicket.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          { _id: "t1", subject: "Issue 1", status: "Open" },
          { _id: "t2", subject: "Issue 2", status: "Resolved" },
        ]),
      });

      const req = new NextRequest("http://localhost/api/support/tickets/my", { method: "GET" });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.items).toHaveLength(2);
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(getSessionUser).mockResolvedValue({
        id: "user1",
        role: "USER",
        orgId: "org1",
      });
      vi.mocked(SupportTicket.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockRejectedValue(new Error("DB Error")),
      });

      const req = new NextRequest("http://localhost/api/support/tickets/my", { method: "GET" });
      const res = await GET(req);

      expect(res.status).toBe(500);
    });
  });
});
