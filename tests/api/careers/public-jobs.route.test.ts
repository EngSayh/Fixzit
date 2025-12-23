/**
 * @fileoverview Tests for /api/careers/public/jobs routes
 * Tests public job listings with cache headers
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock rate limiting
let rateLimitResponse: Response | null = null;
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => rateLimitResponse),
}));

// Mock Job model
vi.mock("@/server/models/Job", () => ({
  Job: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { _id: "job-1", title: "Software Engineer", department: "Engineering" },
        { _id: "job-2", title: "Product Manager", department: "Product" },
      ]),
    }),
    countDocuments: vi.fn().mockResolvedValue(2),
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

// Mock zod
vi.mock("zod", () => {
  const mockSafeParse = (data: unknown) => ({ success: true, data });
  return {
    z: {
      object: () => ({ safeParse: mockSafeParse }),
      string: () => ({ max: () => ({ optional: () => ({}) }) }),
      coerce: {
        number: () => ({
          int: () => ({
            min: () => ({
              max: () => ({ default: () => 1 }),
              default: () => 1,
            }),
          }),
        }),
      },
    },
  };
});

import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const importRoute = async () => {
  try {
    return await import("@/app/api/careers/public/jobs/route");
  } catch {
    return null;
  }
};

describe("API /api/careers/public/jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitResponse = null;
    vi.mocked(enforceRateLimit).mockImplementation(() => rateLimitResponse as any);
  });

  describe("GET - List Public Jobs", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        throw new Error("Route handler missing: GET");
      }

      rateLimitResponse = new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429 },
      );

      const req = new NextRequest("http://localhost:3000/api/careers/public/jobs");
      const response = await route.GET(req);

      expect(response.status).toBe(429);
    });

    it("returns list of public jobs on success", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        throw new Error("Route handler missing: GET");
      }

      const req = new NextRequest("http://localhost:3000/api/careers/public/jobs?orgId=test-org");
      const response = await route.GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.jobs).toHaveLength(2);
      expect(data.pagination.total).toBe(2);
    });

    it("sets Cache-Control header for public job listings", async () => {
      const route = await importRoute();
      if (!route?.GET) {
        throw new Error("Route handler missing: GET");
      }

      const req = new NextRequest("http://localhost:3000/api/careers/public/jobs?orgId=test-org");
      const response = await route.GET(req);

      // Verify cache header is set correctly
      expect(response.headers.get("Cache-Control")).toBe("public, max-age=300, stale-while-revalidate=600");
    });
  });
});
