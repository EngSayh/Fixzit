/**
 * @fileoverview Tests for Superadmin Webhooks Route
 * @route GET/POST /api/superadmin/webhooks
 * @sprint Sprint 38
 * @agent [AGENT-680-FULL]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock dependencies before imports
vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectDb: vi.fn(),
}));

vi.mock("@/server/models/Webhook", () => ({
  Webhook: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { _id: "wh-1", name: "Payment Events", url: "https://example.com/webhook", enabled: true },
          { _id: "wh-2", name: "Order Events", url: "https://example.com/orders", enabled: false },
        ]),
      }),
    }),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

import { GET, POST } from "@/app/api/superadmin/webhooks/route";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockGetSuperadminSession = vi.mocked(getSuperadminSession);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("Superadmin Webhooks Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
  });

  describe("GET /api/superadmin/webhooks", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/superadmin/webhooks");
      const res = await GET(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain("Unauthorized");
    });

    it("returns webhooks list for authenticated superadmin", async () => {
      mockGetSuperadminSession.mockResolvedValue({
        username: "superadmin",
        userId: "sa-1",
        role: "SUPER_ADMIN",
      });

      const req = new NextRequest("http://localhost/api/superadmin/webhooks");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.webhooks).toBeDefined();
    });

    it("enforces rate limiting", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      );

      const req = new NextRequest("http://localhost/api/superadmin/webhooks");
      const res = await GET(req);

      expect(res.status).toBe(429);
    });
  });

  describe("POST /api/superadmin/webhooks", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetSuperadminSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/superadmin/webhooks", {
        method: "POST",
        body: JSON.stringify({
          name: "New Webhook",
          url: "https://example.com/new-hook",
          events: ["payment.completed"],
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("enforces rate limiting on POST", async () => {
      mockEnforceRateLimit.mockReturnValue(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      );

      const req = new NextRequest("http://localhost/api/superadmin/webhooks", {
        method: "POST",
        body: JSON.stringify({
          name: "New Webhook",
          url: "https://example.com/new-hook",
          events: ["payment.completed"],
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(429);
    });
  });
});
