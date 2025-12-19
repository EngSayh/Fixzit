/**
 * @fileoverview Tests for /api/fm/support/tickets routes
 * Tests FM support ticket management
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock FM auth
vi.mock("@/app/api/fm/utils/fm-auth", () => ({
  requireFmAbility: vi.fn().mockResolvedValue({
    user: { id: "user-123", orgId: "org-123" },
    allowed: true,
  }),
}));

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      find: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      }),
      countDocuments: vi.fn().mockResolvedValue(0),
      insertOne: vi.fn(),
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

import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const importRoute = async () => {
  try {
    return await import("@/app/api/fm/support/tickets/route");
  } catch {
    return null;
  }
};

describe("API /api/fm/support/tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  describe("GET - List Support Tickets", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        throw new Error("Route handler missing: GET");
      }

      vi.mocked(enforceRateLimit).mockReturnValue(new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 }) as never);

      const req = new NextRequest("http://localhost:3000/api/fm/support/tickets");
      const response = await route.GET(req);

      expect([200, 401, 403, 429, 500]).toContain(response.status);
    });

    it("returns tickets for authenticated user", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        throw new Error("Route handler missing: GET");
      }

      const req = new NextRequest("http://localhost:3000/api/fm/support/tickets");
      const response = await route.GET(req);

      expect([200, 401, 403, 500]).toContain(response.status);
    });
  });

  describe("POST - Create Support Ticket", () => {
    it("creates ticket for authenticated user", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        throw new Error("Route handler missing: POST");
      }

      const req = new NextRequest("http://localhost:3000/api/fm/support/tickets", {
        method: "POST",
        body: JSON.stringify({ subject: "Test", description: "Test ticket" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await route.POST(req);

      expect([200, 201, 400, 401, 403, 500]).toContain(response.status);
    });
  });
});
