/**
 * @fileoverview Tests for /api/billing/subscribe route
 * Tests authentication, authorization, rate limiting, and subscription creation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  setMockUser,
  clearMockUser,
  mockSessionUser,
} from "@/tests/helpers/mockAuth";

// Mock token-based auth (route uses getUserFromToken, not NextAuth)
vi.mock("@/lib/auth", () => ({
  getUserFromToken: vi.fn(async () => mockSessionUser),
}));

// Deterministic rate limit mock
let rateLimitAllowed = true;
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(async () => ({ allowed: rateLimitAllowed })),
  rateLimitError: vi.fn(
    () =>
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
      }),
  ),
}));

// Mock database
vi.mock("@/db/mongo", () => ({
  getDb: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ insertedId: "sub-123" }),
    }),
  }),
}));

import { POST } from "@/app/api/billing/subscribe/route";
import { getUserFromToken } from "@/lib/auth";

describe("API /api/billing/subscribe", () => {
  beforeEach(() => {
    rateLimitAllowed = true;
    clearMockUser();
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      setMockUser(null);

      const req = new NextRequest(
        "http://localhost:3000/api/billing/subscribe",
        {
          method: "POST",
          body: JSON.stringify({ plan: "pro" }),
        },
      );
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 401 when session has no user", async () => {
      setMockUser(null);

      const req = new NextRequest(
        "http://localhost:3000/api/billing/subscribe",
        {
          method: "POST",
          body: JSON.stringify({ plan: "pro" }),
          headers: {
            Authorization: "Bearer mock-token",
          },
        },
      );
      const res = await POST(req);

      expect(res.status).toBe(401);
    });
  });

  describe("Validation", () => {
    it("returns error for invalid plan type", async () => {
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        role: "ADMIN",
        email: "test@example.com",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/billing/subscribe",
        {
          method: "POST",
          body: JSON.stringify({ plan: "invalid-plan" }),
          headers: {
            Authorization: "Bearer mock-token",
          },
        },
      );
      const res = await POST(req);

      // Route uses Zod validation - returns 400 for invalid plan schema
      expect(res.status).toBe(400);
      expect(getUserFromToken).toHaveBeenCalled();
    });

    it("returns 429 when rate limit exceeded", async () => {
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        role: "ADMIN",
        email: "test@example.com",
      });
      rateLimitAllowed = false;

      const req = new NextRequest(
        "http://localhost:3000/api/billing/subscribe",
        {
          method: "POST",
          body: JSON.stringify({ plan: "pro" }),
          headers: {
            Authorization: "Bearer mock-token",
          },
        },
      );
      const res = await POST(req);

      expect(res.status).toBe(429);
    });
  });
});
