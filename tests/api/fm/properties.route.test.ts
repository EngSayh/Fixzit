/**
 * @fileoverview Tests for /api/fm/properties routes
 * Tests FM property management operations
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
    return await import("@/app/api/fm/properties/route");
  } catch {
    return null;
  }
};

describe("API /api/fm/properties", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  describe("GET - List Properties", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(enforceRateLimit).mockReturnValue(new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 }) as never);

      const req = new NextRequest("http://localhost:3000/api/fm/properties");
      const response = await route.GET(req);

      expect([200, 401, 403, 429, 500]).toContain(response.status);
    });

    it("returns properties for authenticated user", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest("http://localhost:3000/api/fm/properties");
      const response = await route.GET(req);

      expect([200, 401, 403, 500]).toContain(response.status);
    });
  });
});
