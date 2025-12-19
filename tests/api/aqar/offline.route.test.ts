/**
 * @fileoverview Tests for /api/aqar/offline routes
 * Tests Aqar offline sync functionality
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock authentication
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(),
}));

vi.mock("@/services/aqar/offline-cache-service", () => ({
  AqarOfflineCacheService: {
    getOrBuildBundle: vi.fn(),
  },
}));

// Mock database
vi.mock("@/lib/mongo", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
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
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { AqarOfflineCacheService } from "@/services/aqar/offline-cache-service";

const importRoute = async () => {
  try {
    return await import("@/app/api/aqar/offline/route");
  } catch {
    return null;
  }
};

describe("API /api/aqar/offline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSessionUser).mockResolvedValue(null);
    vi.mocked(AqarOfflineCacheService.getOrBuildBundle).mockResolvedValue({
      cacheKey: "cache-test",
      checksum: "checksum-test",
      expiresAt: new Date(),
      listingCount: 0,
      version: 1,
      generatedAt: new Date().toISOString(),
      listings: [],
      facets: { propertyTypes: {}, cities: {}, proptech: {} },
    });
  });

  describe("GET - Offline Bundle", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        throw new Error("Route handler missing: GET");
      }

      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/aqar/offline");
      const response = await route.GET(req);

      expect(response.status).toBe(429);
    });

    it("returns offline bundle without authentication", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        throw new Error("Route handler missing: GET");
      }

      vi.mocked(getSessionUser).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost:3000/api/aqar/offline");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
    });
  });
});
