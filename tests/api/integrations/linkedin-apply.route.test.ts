/**
 * @fileoverview Tests for /api/integrations/linkedin/apply route
 * Tests rate limiting, feature flag, and LinkedIn application flow
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Deterministic rate limit mock
let rateLimitAllowed = true;
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(async () => ({ allowed: rateLimitAllowed })),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(
    () =>
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
      })
  ),
  notFoundError: vi.fn(
    () =>
      new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
  ),
  validationError: vi.fn((msg: string) =>
    new Response(JSON.stringify({ error: msg }), { status: 400 })
  ),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((body, status) => {
    return new Response(JSON.stringify(body), { status });
  }),
  getClientIP: vi.fn(() => "127.0.0.1"),
}));

// Mock database
vi.mock("@/lib/mongo", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

// Mock models
vi.mock("@/server/models/Job", () => ({
  Job: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
  },
}));

vi.mock("@/server/models/Candidate", () => ({
  Candidate: {
    findByEmail: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ _id: "candidate-123" }),
  },
}));

vi.mock("@/server/models/Application", () => ({
  Application: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
    create: vi.fn().mockResolvedValue({ _id: "app-123" }),
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { POST } from "@/app/api/integrations/linkedin/apply/route";

describe("API /api/integrations/linkedin/apply", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    rateLimitAllowed = true;
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Rate Limiting", () => {
    it("returns 429 when rate limited", async () => {
      rateLimitAllowed = false;

      const req = new NextRequest(
        "http://localhost:3000/api/integrations/linkedin/apply",
        {
          method: "POST",
          body: JSON.stringify({
            jobSlug: "job-123",
            profile: { email: "test@example.com" },
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      expect(res.status).toBe(429);
    });
  });

  describe("Feature Flag", () => {
    it("returns 501 when ATS_ENABLED is not true", async () => {
      process.env.ATS_ENABLED = "false";

      const req = new NextRequest(
        "http://localhost:3000/api/integrations/linkedin/apply",
        {
          method: "POST",
          body: JSON.stringify({
            jobSlug: "job-123",
            profile: { email: "test@example.com" },
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      expect(res.status).toBe(501);
      const data = await res.json();
      expect(data.error).toContain("not available");
    });

    it("returns 501 when ATS_ENABLED is undefined", async () => {
      delete process.env.ATS_ENABLED;

      const req = new NextRequest(
        "http://localhost:3000/api/integrations/linkedin/apply",
        {
          method: "POST",
          body: JSON.stringify({
            jobSlug: "job-123",
            profile: { email: "test@example.com" },
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      expect(res.status).toBe(501);
    });
  });

  describe("Validation", () => {
    it("returns 404 when job not found", async () => {
      process.env.ATS_ENABLED = "true";

      const req = new NextRequest(
        "http://localhost:3000/api/integrations/linkedin/apply",
        {
          method: "POST",
          body: JSON.stringify({
            jobSlug: "nonexistent-job",
            profile: { email: "test@example.com", firstName: "Test" },
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      // 404 for job not found
      expect(res.status).toBe(404);
    });
  });
});
