/**
 * @fileoverview Tests for /api/sms/test route
 * Tests authentication, authorization (SUPER_ADMIN only), rate limiting, and SMS test functionality
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
let mockSession: { user?: { id: string; role?: string } } | null = null;
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => mockSession),
}));

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

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn(() => "127.0.0.1"),
}));

// Mock SMS functions
vi.mock("@/lib/sms", () => ({
  sendSMS: vi.fn().mockResolvedValue({ success: true, messageSid: "SM123" }),
  testSMSConfiguration: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/sms-providers/phone-utils", () => ({
  redactPhoneNumber: vi.fn((phone: string) => phone.replace(/\d(?=\d{4})/g, "*")),
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

import { POST } from "@/app/api/sms/test/route";

describe("API /api/sms/test", () => {
  beforeEach(() => {
    mockSession = null;
    rateLimitAllowed = true;
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development"); // SMS test only works in dev
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("Production Protection", () => {
    it("returns 404 in production environment", async () => {
      vi.stubEnv("NODE_ENV", "production");
      mockSession = { user: { id: "user-123", role: "SUPER_ADMIN" } };

      const req = new NextRequest("http://localhost:3000/api/sms/test", {
        method: "POST",
        body: JSON.stringify({ testConfig: true }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(404);
    });
  });

  describe("Rate Limiting", () => {
    it("returns 429 when rate limited", async () => {
      rateLimitAllowed = false;
      vi.stubEnv("NODE_ENV", "development");

      const req = new NextRequest("http://localhost:3000/api/sms/test", {
        method: "POST",
        body: JSON.stringify({ testConfig: true }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(429);
    });
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockSession = null;

      const req = new NextRequest("http://localhost:3000/api/sms/test", {
        method: "POST",
        body: JSON.stringify({ testConfig: true }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });
  });

  describe("Authorization", () => {
    it("returns 403 for non-SUPER_ADMIN users", async () => {
      mockSession = { user: { id: "user-123", role: "ADMIN" } };

      const req = new NextRequest("http://localhost:3000/api/sms/test", {
        method: "POST",
        body: JSON.stringify({ testConfig: true }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Super Admin");
    });

    it("returns 403 for USER role", async () => {
      mockSession = { user: { id: "user-123", role: "USER" } };

      const req = new NextRequest("http://localhost:3000/api/sms/test", {
        method: "POST",
        body: JSON.stringify({ testConfig: true }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
    });
  });

  describe("Validation", () => {
    it("returns 400 when phone and message are missing", async () => {
      mockSession = { user: { id: "user-123", role: "SUPER_ADMIN" } };

      const req = new NextRequest("http://localhost:3000/api/sms/test", {
        method: "POST",
        body: JSON.stringify({}), // No testConfig, no phone/message
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("phone");
    });
  });

  describe("Success Cases", () => {
    it("tests SMS configuration when testConfig is true", async () => {
      mockSession = { user: { id: "user-123", role: "SUPER_ADMIN" } };

      const req = new NextRequest("http://localhost:3000/api/sms/test", {
        method: "POST",
        body: JSON.stringify({ testConfig: true }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain("Taqnyat");
    });

    it("sends test SMS when phone and message provided", async () => {
      mockSession = { user: { id: "user-123", role: "SUPER_ADMIN" } };

      const req = new NextRequest("http://localhost:3000/api/sms/test", {
        method: "POST",
        body: JSON.stringify({
          phone: "+966500000000",
          message: "Test message",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });
});
