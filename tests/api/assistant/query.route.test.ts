/**
 * @fileoverview Tests for /api/assistant/query route
 * Tests authentication, rate limiting, and AI assistant query processing
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  setMockUser,
  clearMockUser,
} from "@/tests/helpers/mockAuth";

// Mock session via getSessionUser
vi.mock("@/server/middleware/withAuthRbac", async () => {
  class UnauthorizedError extends Error {
    constructor(message = "Authentication required") {
      super(message);
      this.name = "UnauthorizedError";
    }
  }
  
  return {
    getSessionUser: vi.fn(async () => {
      const { mockSessionUser: currentUser } = await import("@/tests/helpers/mockAuth");
      if (!currentUser) {
        throw new UnauthorizedError("Authentication required");
      }
      return currentUser;
    }),
    UnauthorizedError,
  };
});

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
}));

vi.mock("@/server/security/rateLimitKey", () => ({
  buildOrgAwareRateLimitKey: vi.fn(() => "test-rate-key"),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((body, status) => {
    return new Response(JSON.stringify(body), { status });
  }),
}));

// Mock database
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock models
vi.mock("@/server/models/HelpArticle", () => ({
  HelpArticle: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}));

vi.mock("@/server/models/WorkOrder", () => ({
  WorkOrder: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
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

import { POST } from "@/app/api/assistant/query/route";

describe("API /api/assistant/query", () => {
  beforeEach(() => {
    rateLimitAllowed = true;
    clearMockUser();
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("allows unauthenticated users for public help queries", async () => {
      setMockUser(null);

      const req = new NextRequest(
        "http://localhost:3000/api/assistant/query",
        {
          method: "POST",
          body: JSON.stringify({ question: "How do I create a work order?" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      // Route allows public queries - returns 200 for help queries
      expect(res.status).toBe(200);
    });
  });

  describe("Rate Limiting", () => {
    it("returns 429 when rate limited", async () => {
      rateLimitAllowed = false;
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        role: "USER",
        email: "test@example.com",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/assistant/query",
        {
          method: "POST",
          body: JSON.stringify({ question: "How do I create a work order?" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      expect(res.status).toBe(429);
    });
  });

  describe("Validation", () => {
    it("returns 400 for empty question", async () => {
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        role: "USER",
        email: "test@example.com",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/assistant/query",
        {
          method: "POST",
          body: JSON.stringify({ question: "" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("returns 400 for missing question field", async () => {
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        role: "USER",
        email: "test@example.com",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/assistant/query",
        {
          method: "POST",
          body: JSON.stringify({}),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });

  describe("Success Cases", () => {
    it("processes valid query", async () => {
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        role: "USER",
        email: "test@example.com",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/assistant/query",
        {
          method: "POST",
          body: JSON.stringify({ question: "How do I create a work order?" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      // 200 for successful query processing
      expect(res.status).toBe(200);
    });
  });
});
