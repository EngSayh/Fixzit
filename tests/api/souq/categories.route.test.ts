/**
 * @fileoverview Tests for /api/souq/categories routes
 * Tests category listing with cache headers
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
let rateLimitResponse: Response | null = null;
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => rateLimitResponse),
}));

// Mock Category model
vi.mock("@/server/models/souq/Category", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { _id: "cat-1", name: "Electronics", name_ar: "إلكترونيات", level: 1 },
        { _id: "cat-2", name: "Furniture", name_ar: "أثاث", level: 1 },
      ]),
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

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const importRoute = async () => {
  try {
    return await import("@/app/api/souq/categories/route");
  } catch {
    return null;
  }
};

describe("API /api/souq/categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitResponse = null;
    vi.mocked(enforceRateLimit).mockImplementation(() => rateLimitResponse as any);
  });

  describe("GET - List Categories", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        throw new Error("Route handler missing: GET");
      }

      rateLimitResponse = new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429 },
      );

      const req = new NextRequest("http://localhost:3000/api/souq/categories");
      const response = await route.GET(req);

      expect(response.status).toBe(429);
    });

    it("returns list of categories on success", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        throw new Error("Route handler missing: GET");
      }

      const req = new NextRequest("http://localhost:3000/api/souq/categories");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it("sets Cache-Control header for public category listing", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        throw new Error("Route handler missing: GET");
      }

      const req = new NextRequest("http://localhost:3000/api/souq/categories");
      const response = await route.GET(req);

      // Verify cache header is set correctly
      expect(response.headers.get("Cache-Control")).toBe("public, max-age=300, stale-while-revalidate=600");
    });
  });
});
