/**
 * @fileoverview Tests for /api/subscribe/owner route
 * Tests authentication, authorization, rate limiting, and subscription checkout
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Async factory pattern for UnauthorizedError instanceof checks
vi.mock("@/server/middleware/withAuthRbac", async () => {
  class UnauthorizedError extends Error {
    constructor(message = "Unauthenticated") {
      super(message);
      this.name = "UnauthorizedError";
    }
  }
  return {
    getSessionUser: vi.fn(async () => {
      const { mockSessionUser: currentUser } = await import(
        "@/tests/helpers/mockAuth"
      );
      if (!currentUser) throw new UnauthorizedError();
      return currentUser;
    }),
    UnauthorizedError,
  };
});

// Rate limit mock
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
  unauthorizedError: vi.fn(
    () =>
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  ),
  forbiddenError: vi.fn(
    () =>
      new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
  ),
  validationError: vi.fn((message) =>
    new Response(JSON.stringify({ error: message }), { status: 400 })
  ),
  handleApiError: vi.fn((error) =>
    new Response(JSON.stringify({ error: error.message }), { status: 500 })
  ),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((body, status) => {
    return new Response(JSON.stringify(body), { status });
  }),
}));

// Mock database
vi.mock("@/db/mongoose", () => ({
  dbConnect: vi.fn().mockResolvedValue(undefined),
}));

// Mock checkout function
vi.mock("@/lib/finance/checkout", () => ({
  createSubscriptionCheckout: vi.fn().mockResolvedValue({
    checkoutId: "checkout-123",
    url: "https://pay.example.com/checkout-123",
  }),
}));

import { POST } from "@/app/api/subscribe/owner/route";
import { setMockUser, clearMockUser } from "@/tests/helpers/mockAuth";

describe("API /api/subscribe/owner", () => {
  beforeEach(() => {
    clearMockUser();
    rateLimitAllowed = true;
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      clearMockUser();

      const req = new NextRequest(
        "http://localhost:3000/api/subscribe/owner",
        {
          method: "POST",
          body: JSON.stringify({
            ownerUserId: "owner-123",
            modules: ["PROPERTIES"],
            seats: 1,
            customer: { email: "owner@example.com" },
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      // Route returns 401 when auth fails
      expect(res.status).toBe(401);
    });
  });

  describe("Authorization", () => {
    it("returns 403 when non-admin user tries to subscribe for another user", async () => {
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        email: "user@example.com",
        role: "MEMBER", // Non-admin role
      });

      const req = new NextRequest(
        "http://localhost:3000/api/subscribe/owner",
        {
          method: "POST",
          body: JSON.stringify({
            ownerUserId: "other-user-456", // Different user
            modules: ["PROPERTIES"],
            seats: 1,
            customer: { email: "other@example.com" },
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      expect(res.status).toBe(403);
    });

    it("allows non-admin user to subscribe for themselves", async () => {
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        email: "user@example.com",
        role: "MEMBER",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/subscribe/owner",
        {
          method: "POST",
          body: JSON.stringify({
            ownerUserId: "user-123", // Same user
            modules: ["PROPERTIES"],
            seats: 1,
            customer: { email: "user@example.com" },
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      // 200 for successful subscription (subscribing for self)
      expect(res.status).toBe(200);
    });

    it("allows admin to subscribe for any user", async () => {
      setMockUser({
        id: "admin-123",
        orgId: "org-123",
        email: "admin@example.com",
        role: "ADMIN",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/subscribe/owner",
        {
          method: "POST",
          body: JSON.stringify({
            ownerUserId: "other-user-456", // Different user
            modules: ["PROPERTIES"],
            seats: 1,
            customer: { email: "other@example.com" },
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      // 200 for successful subscription (admin can subscribe for anyone)
      expect(res.status).toBe(200);
    });
  });

  describe("Rate Limiting", () => {
    it("returns 429 when rate limited", async () => {
      rateLimitAllowed = false;
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        email: "user@example.com",
        role: "ADMIN",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/subscribe/owner",
        {
          method: "POST",
          body: JSON.stringify({
            ownerUserId: "user-123",
            modules: ["PROPERTIES"],
            seats: 1,
            customer: { email: "user@example.com" },
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      expect(res.status).toBe(429);
    });
  });

  describe("Validation", () => {
    it("returns error for missing required fields", async () => {
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        email: "user@example.com",
        role: "ADMIN",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/subscribe/owner",
        {
          method: "POST",
          body: JSON.stringify({
            // Missing required fields
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      // 400 for validation error (missing required fields)
      expect(res.status).toBe(400);
    });
  });

  describe("Success Cases", () => {
    it("creates subscription checkout for valid request", async () => {
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        email: "user@example.com",
        role: "ADMIN",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/subscribe/owner",
        {
          method: "POST",
          body: JSON.stringify({
            ownerUserId: "user-123",
            modules: ["PROPERTIES", "TENANTS"],
            seats: 5,
            customer: { email: "user@example.com", name: "Test User" },
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      // 200 for successful subscription checkout creation
      expect(res.status).toBe(200);
    });
  });
});
