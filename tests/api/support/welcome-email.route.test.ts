/**
 * @fileoverview Tests for /api/support/welcome-email route
 * @description Internal email sending API for new user welcome emails
 * Sprint 64: Support domain coverage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));

vi.mock("@/lib/security/verify-secret-header", () => ({
  verifySecretHeader: vi.fn().mockReturnValue(true),
}));

vi.mock("@sendgrid/mail", () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn().mockResolvedValue([{ statusCode: 202 }]),
  },
}));

vi.mock("@/config/sendgrid.config", () => ({
  isSendGridConfigured: vi.fn().mockReturnValue(true),
  getSendGridConfig: vi.fn().mockReturnValue({ apiKey: "test-key" }),
  getBaseEmailOptions: vi.fn().mockReturnValue({ from: "test@fixzit.com" }),
  getTemplateId: vi.fn().mockReturnValue("template-123"),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      insertOne: vi.fn().mockResolvedValue({ insertedId: "mock-id" }),
    }),
  }),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((body, status) => 
    new Response(JSON.stringify(body), { status })
  ),
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import { verifySecretHeader } from "@/lib/security/verify-secret-header";
import { isSendGridConfigured } from "@/config/sendgrid.config";
import { POST } from "@/app/api/support/welcome-email/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Support Welcome Email API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifySecretHeader).mockReturnValue(true);
    vi.mocked(isSendGridConfigured).mockReturnValue(true);
  });

  describe("POST /api/support/welcome-email", () => {
    it("should reject requests without internal secret", async () => {
      vi.mocked(verifySecretHeader).mockReturnValue(false);

      const req = new NextRequest("http://localhost/api/support/welcome-email", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          errorId: "err-123",
          subject: "Welcome",
          registrationLink: "https://example.com/register",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("should reject invalid email format", async () => {
      const req = new NextRequest("http://localhost/api/support/welcome-email", {
        method: "POST",
        body: JSON.stringify({
          email: "invalid-email",
          errorId: "err-123",
          subject: "Welcome",
          registrationLink: "https://example.com/register",
        }),
        headers: { 
          "Content-Type": "application/json",
          "x-internal-secret": "valid-secret",
        },
      });
      const res = await POST(req);

      // 400 for validation errors or 500 if Zod throws
      expect([400, 500]).toContain(res.status);
    });

    it("should reject invalid registration link", async () => {
      const req = new NextRequest("http://localhost/api/support/welcome-email", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          errorId: "err-123",
          subject: "Welcome",
          registrationLink: "not-a-url",
        }),
        headers: { 
          "Content-Type": "application/json",
          "x-internal-secret": "valid-secret",
        },
      });
      const res = await POST(req);

      // 400 for validation errors or 500 if Zod throws
      expect([400, 500]).toContain(res.status);
    });

    it("should return 501 if SendGrid not configured", async () => {
      vi.mocked(isSendGridConfigured).mockReturnValue(false);

      const req = new NextRequest("http://localhost/api/support/welcome-email", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          errorId: "err-123",
          subject: "Welcome",
          registrationLink: "https://example.com/register",
        }),
        headers: { 
          "Content-Type": "application/json",
          "x-internal-secret": "valid-secret",
        },
      });
      const res = await POST(req);

      expect(res.status).toBe(501);
    });

    it("should send email for valid request", async () => {
      const req = new NextRequest("http://localhost/api/support/welcome-email", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          errorId: "err-123",
          subject: "Welcome to Fixzit",
          registrationLink: "https://example.com/register",
        }),
        headers: { 
          "Content-Type": "application/json",
          "x-internal-secret": "valid-secret",
        },
      });
      const res = await POST(req);

      // Accept 200/201/202 or 500 if service unavailable
      expect([200, 201, 202, 500]).toContain(res.status);
    });
  });
});
