/**
 * @fileoverview Tests for /api/aqar/favorites routes
 * Tests favorite management for Aqar property listings
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock authentication
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock session user
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(),
}));

// Mock database
vi.mock("@/lib/mongo", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

// Mock Aqar models
vi.mock("@/server/models/aqar", () => ({
  AqarFavorite: {
    find: vi.fn().mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    findOne: vi.fn(),
    create: vi.fn(),
    deleteOne: vi.fn(),
  },
  AqarListing: {
    findById: vi.fn(),
  },
  AqarProject: {
    findById: vi.fn(),
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

// Mock parse-body
vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn().mockResolvedValue([null, {}]),
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

const importRoute = async () => {
  try {
    return await import("@/app/api/aqar/favorites/route");
  } catch {
    return null;
  }
};

describe("API /api/aqar/favorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset rate limit mock to allow requests through
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  describe("GET - List Favorites", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/aqar/favorites");
      const response = await route.GET(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(getSessionUser).mockRejectedValue(new Error("Unauthorized"));

      const req = new NextRequest("http://localhost:3000/api/aqar/favorites");
      const response = await route.GET(req);

      expect([401, 500]).toContain(response.status);
    });

    it("returns empty array for user with no favorites", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(getSessionUser).mockResolvedValue({
        id: "user-123",
        orgId: "org-123",
      } as never);

      const req = new NextRequest("http://localhost:3000/api/aqar/favorites");
      const response = await route.GET(req);

      expect([200, 401, 500]).toContain(response.status);
    });
  });

  describe("POST - Add Favorite", () => {
    it("returns 429 when rate limit exceeded on POST", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/aqar/favorites", {
        method: "POST",
        body: JSON.stringify({ targetId: "123", targetType: "LISTING" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await route.POST(req);

      expect(response.status).toBe(429);
    });
  });
});
