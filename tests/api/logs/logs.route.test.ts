/**
 * @fileoverview Tests for /api/logs route
 * Tests authentication, tenant isolation, rate limiting, and log ingestion
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
let mockSession: { user?: { id: string; orgId?: string; tenantId?: string } } | null = null;
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

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

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  },
}));

import { POST } from "@/app/api/logs/route";

describe("API /api/logs", () => {
  beforeEach(() => {
    mockSession = null;
    rateLimitAllowed = true;
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockSession = null;

      const req = new NextRequest("http://localhost:3000/api/logs", {
        method: "POST",
        body: JSON.stringify({ level: "info", message: "test" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });
  });

  describe("Tenant Isolation", () => {
    it("returns 400 when user has no orgId", async () => {
      mockSession = { user: { id: "user-123", orgId: undefined } };

      const req = new NextRequest("http://localhost:3000/api/logs", {
        method: "POST",
        body: JSON.stringify({ level: "info", message: "test" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("organization");
    });
  });

  describe("Rate Limiting", () => {
    it("returns 429 when rate limited", async () => {
      rateLimitAllowed = false;
      mockSession = { user: { id: "user-123", orgId: "org-123" } };

      const req = new NextRequest("http://localhost:3000/api/logs", {
        method: "POST",
        body: JSON.stringify({ level: "info", message: "test" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(429);
    });
  });

  describe("Validation", () => {
    it("returns 400 for invalid JSON body", async () => {
      mockSession = { user: { id: "user-123", orgId: "org-123" } };

      const req = new NextRequest("http://localhost:3000/api/logs", {
        method: "POST",
        body: "not json",
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("returns 400 when level is missing", async () => {
      mockSession = { user: { id: "user-123", orgId: "org-123" } };

      const req = new NextRequest("http://localhost:3000/api/logs", {
        method: "POST",
        body: JSON.stringify({ message: "test" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("level");
    });

    it("returns 400 when message is missing", async () => {
      mockSession = { user: { id: "user-123", orgId: "org-123" } };

      const req = new NextRequest("http://localhost:3000/api/logs", {
        method: "POST",
        body: JSON.stringify({ level: "info" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("message");
    });
  });

  describe("Success Cases", () => {
    it("accepts valid log entries", async () => {
      mockSession = { user: { id: "user-123", orgId: "org-123" } };

      const req = new NextRequest("http://localhost:3000/api/logs", {
        method: "POST",
        body: JSON.stringify({
          level: "info",
          message: "Test log message",
          context: { action: "test" },
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });
  });
});
