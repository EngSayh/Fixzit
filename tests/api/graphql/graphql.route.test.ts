/**
 * @fileoverview Tests for /api/graphql route
 * Tests rate limiting and GraphQL handler
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Deterministic rate limit mock
let rateLimitAllowed = true;
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(async () => ({ allowed: rateLimitAllowed })),
  buildOrgAwareRateLimitKey: vi.fn(() => "test-rate-key"),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(
    () =>
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
      })
  ),
}));

// Mock GraphQL handler
vi.mock("@/lib/graphql", () => ({
  createGraphQLHandler: vi.fn(() => ({
    handleRequest: vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { __typename: "Query" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    ),
  })),
}));

// Mock route wrapper
vi.mock("@/lib/api/route-wrapper", () => ({
  wrapRoute: vi.fn((handler) => handler),
}));

import { GET, POST } from "@/app/api/graphql/route";

describe("API /api/graphql", () => {
  beforeEach(() => {
    rateLimitAllowed = true;
    vi.clearAllMocks();
  });

  describe("Rate Limiting", () => {
    it("returns 429 when rate limited on GET", async () => {
      rateLimitAllowed = false;

      const req = new NextRequest("http://localhost:3000/api/graphql", {
        method: "GET",
      });
      const res = await GET(req);

      expect(res.status).toBe(429);
    });

    it("returns 429 when rate limited on POST", async () => {
      rateLimitAllowed = false;

      const req = new NextRequest("http://localhost:3000/api/graphql", {
        method: "POST",
        body: JSON.stringify({ query: "{ __typename }" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(429);
    });
  });

  describe("Success Cases", () => {
    it("handles GET requests", async () => {
      const req = new NextRequest("http://localhost:3000/api/graphql", {
        method: "GET",
      });
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("handles POST requests with GraphQL query", async () => {
      const req = new NextRequest("http://localhost:3000/api/graphql", {
        method: "POST",
        body: JSON.stringify({ query: "{ __typename }" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });
  });
});
