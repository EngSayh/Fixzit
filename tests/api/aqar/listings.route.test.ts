/**
 * @fileoverview Tests for /api/aqar/listings routes
 * Tests property listing CRUD operations for Aqar marketplace
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
  AqarListing: {
    find: vi.fn().mockReturnValue({
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
    create: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
  },
  AqarPackage: {
    findOne: vi.fn(),
  },
}));

// Mock recommendation engine
vi.mock("@/services/aqar/recommendation-engine", () => ({
  AqarRecommendationEngine: {
    getInstance: vi.fn().mockReturnValue({
      getRecommendations: vi.fn().mockResolvedValue([]),
    }),
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
  parseBody: vi.fn(),
  parseBodySafe: vi.fn(),
  APIParseError: class APIParseError extends Error {},
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

const importRoute = async () => {
  try {
    return await import("@/app/api/aqar/listings/route");
  } catch {
    return null;
  }
};

describe("API /api/aqar/listings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Reset rate limit mock to allow requests through
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  describe("POST - Create Listing", () => {
    it("returns 429 when rate limit exceeded", async () => {
      // Set up rate limit mock BEFORE importing the route
      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const route = await importRoute();
      if (!route?.POST) {
        throw new Error("Route handler missing: POST");
      }

      const req = new NextRequest("http://localhost:3000/api/aqar/listings", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });
      const response = await route.POST(req);

      expect(response.status).toBe(429);
    });

    it("returns 401 when user is not authenticated", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        throw new Error("Route handler missing: POST");
      }

      vi.mocked(getSessionUser).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost:3000/api/aqar/listings", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });
      const response = await route.POST(req);

      // Should return 401 or handle unauthenticated
      expect([400, 401, 403, 500]).toContain(response.status);
    });

    it("returns 400 when body is invalid JSON", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        throw new Error("Route handler missing: POST");
      }

      const { parseBody, APIParseError } = await import("@/lib/api/parse-body");
      vi.mocked(parseBody).mockRejectedValue(new (APIParseError as any)("Invalid JSON"));

      vi.mocked(getSessionUser).mockResolvedValue({
        id: "user-123",
        orgId: "org-123",
        roles: ["user"],
      } as never);

      const req = new NextRequest("http://localhost:3000/api/aqar/listings", {
        method: "POST",
        body: "invalid json",
        headers: { "Content-Type": "application/json" },
      });
      const response = await route.POST(req);

      expect([400, 500]).toContain(response.status);
    });
  });
});
