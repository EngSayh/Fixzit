/**
 * @fileoverview Tests for /api/feeds/linkedin route
 * Tests ATS feature flag and job feed generation
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock Job model
vi.mock("@/server/models/Job", () => ({
  Job: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            slug: "test-job",
            title: "Test Job",
            location: { city: "Riyadh", country: "SA" },
            description: "Test description",
            jobType: "full-time",
            publishedAt: new Date(),
          },
        ]),
      }),
    }),
  },
}));

// Mock secure response
vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((body, status) => {
    return new Response(JSON.stringify(body), { status });
  }),
}));

// Mock domains config
vi.mock("@/lib/config/domains", () => ({
  DOMAINS: {
    careers: "careers.example.com",
  },
}));

import { GET } from "@/app/api/feeds/linkedin/route";

describe("API /api/feeds/linkedin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Feature Flag", () => {
    it("returns 501 when ATS_ENABLED is not true", async () => {
      process.env.ATS_ENABLED = "false";

      const req = new NextRequest("http://localhost:3000/api/feeds/linkedin", {
        method: "GET",
      });
      const res = await GET(req);

      expect(res.status).toBe(501);
      const data = await res.json();
      expect(data.error).toContain("not available");
    });

    it("returns 501 when ATS_ENABLED is undefined", async () => {
      delete process.env.ATS_ENABLED;

      const req = new NextRequest("http://localhost:3000/api/feeds/linkedin", {
        method: "GET",
      });
      const res = await GET(req);

      expect(res.status).toBe(501);
    });
  });

  describe("Success Cases", () => {
    it("returns job feed when ATS is enabled", async () => {
      process.env.ATS_ENABLED = "true";

      const req = new NextRequest("http://localhost:3000/api/feeds/linkedin", {
        method: "GET",
      });
      const res = await GET(req);

      // Should return 200 with XML or JSON feed
      expect(res.status).toBe(200);
    });
  });
});
