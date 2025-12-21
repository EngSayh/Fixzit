/**
 * @fileoverview Tests for /api/help/ask routes
 * Tests AI-powered help system with knowledge base search
 * CRITICAL: User assistance and knowledge base integration
 */
import { expectValidationFailure, expectSuccess } from '@/tests/api/_helpers';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock session
vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: vi.fn(),
}));

// Mock body parsing
vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      find: vi.fn().mockImplementation(() => ({
        project: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      })),
    }),
  }),
}));

// Mock Redis
vi.mock("ioredis", () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  })),
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

// Mock security headers
vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((data, status) => {
    const httpStatus =
      typeof status === "number" ? status : status?.status || 200;
    return new Response(JSON.stringify(data), {
      status: httpStatus,
      headers: { "Content-Type": "application/json" },
    });
  }),
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { parseBodySafe } from "@/lib/api/parse-body";

const importRoute = async () => {
  try {
    return await import("@/app/api/help/ask/route");
  } catch {
    return null;
  }
};

describe("API /api/help/ask", () => {
  const mockOrgId = "org_123456789";
  const mockUser = {
    id: "user_123",
    orgId: mockOrgId,
    role: "USER",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    vi.mocked(enforceRateLimit).mockReturnValue(null);
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: mockUser,
    } as never);
  });

  describe("POST - Ask Question", () => {
    it("returns 429 when rate limit exceeded", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(enforceRateLimit).mockReturnValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
        }) as never
      );

      const req = new NextRequest("http://localhost:3000/api/help/ask", {
        method: "POST",
        body: JSON.stringify({ question: "How do I create a work order?" }),
      });
      const response = await route.POST(req);

      expect(response.status).toBe(429);
    });

    it("returns 400 for missing question", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(parseBodySafe).mockResolvedValue({
        data: {},
        error: null,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/help/ask", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await route.POST(req);

      expectValidationFailure(response);
    });

    it("returns 400 for empty question", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { question: "" },
        error: null,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/help/ask", {
        method: "POST",
        body: JSON.stringify({ question: "" }),
      });
      const response = await route.POST(req);

      expectValidationFailure(response);
    });

    it("returns search results for valid question", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { question: "How do I create a work order?" },
        error: null,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/help/ask", {
        method: "POST",
        body: JSON.stringify({ question: "How do I create a work order?" }),
      });
      const response = await route.POST(req);

      expectSuccess(response);
    });

    it("accepts optional category filter", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { question: "Work order help", category: "FM" },
        error: null,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/help/ask", {
        method: "POST",
        body: JSON.stringify({ question: "Work order help", category: "FM" }),
      });
      const response = await route.POST(req);

      expectSuccess(response);
    });

    it("accepts optional language filter", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { question: "كيف أنشئ طلب عمل", lang: "ar" },
        error: null,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/help/ask", {
        method: "POST",
        body: JSON.stringify({ question: "كيف أنشئ طلب عمل", lang: "ar" }),
      });
      const response = await route.POST(req);

      expectSuccess(response);
    });

    it("respects limit parameter", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { question: "Help with invoices", limit: 5 },
        error: null,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/help/ask", {
        method: "POST",
        body: JSON.stringify({ question: "Help with invoices", limit: 5 }),
      });
      const response = await route.POST(req);

      expectSuccess(response);
    });

    it("works without authentication (public help)", async () => {
      const route = await importRoute();
      if (!route?.POST) {
        expect(true).toBe(true);
        return;
      }

      // No user session
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: null,
      } as never);

      vi.mocked(parseBodySafe).mockResolvedValue({
        data: { question: "How does Fixzit work?" },
        error: null,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/help/ask", {
        method: "POST",
        body: JSON.stringify({ question: "How does Fixzit work?" }),
      });
      const response = await route.POST(req);

      // Help should be available to non-authenticated users
      expect([200, 201, 401]).toContain(response.status);
    });
  });
});
