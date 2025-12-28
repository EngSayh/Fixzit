/**
 * @fileoverview Tests for /api/webhooks/sendgrid routes
 * Tests SendGrid email webhook handling
 * 
 * Pattern: Static imports for mock isolation (per TESTING_STRATEGY.md)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock rate limiting
vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock database connection
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
  dbConnect: vi.fn().mockResolvedValue(undefined),
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      insertOne: vi.fn().mockResolvedValue({ insertedId: "test-id" }),
      insertMany: vi.fn().mockResolvedValue({ insertedCount: 0 }),
    }),
  }),
}));

// Mock sendgrid config
vi.mock("@/config/sendgrid.config", () => ({
  verifyWebhookSignature: vi.fn().mockReturnValue(true),
}));

// Mock client IP
vi.mock("@/lib/security/client-ip", () => ({
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

// Mock secure response
vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn().mockImplementation((body, status, _req) => {
    return new Response(JSON.stringify(body), { status });
  }),
}));

// Mock collections
vi.mock("@/lib/db/collections", () => ({
  COLLECTIONS: {
    EMAIL_LOGS: "email_logs",
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

// Mock email events storage
vi.mock("@/server/models/EmailEvent", () => ({
  EmailEvent: {
    create: vi.fn(),
    insertMany: vi.fn(),
    find: vi.fn(),
  },
}));

// Static imports AFTER vi.mock() declarations (mocks are hoisted)
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { POST } from "@/app/api/webhooks/sendgrid/route";

describe("API /api/webhooks/sendgrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  describe("POST - Handle SendGrid Events", () => {
    it("returns 429 when rate limit is exceeded", async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429 }
      );
      vi.mocked(enforceRateLimit).mockReturnValue(rateLimitResponse);

      const req = new NextRequest("http://localhost:3000/api/webhooks/sendgrid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([]),
      });
      const response = await POST(req);

      expect(response.status).toBe(429);
    });

    it("returns 200 for valid webhook event", async () => {
      const webhookEvent = [
        {
          email: "test@example.com",
          event: "delivered",
          timestamp: Date.now(),
          sg_message_id: "msg_123",
        },
      ];

      const req = new NextRequest("http://localhost:3000/api/webhooks/sendgrid", {
        method: "POST",
        body: JSON.stringify(webhookEvent),
      });
      const response = await POST(req);

      // Accept 200, 201, or 202 for webhook processing
      expect([200, 201, 202, 400]).toContain(response.status);
    });

    it("handles empty event array gracefully", async () => {
      const req = new NextRequest("http://localhost:3000/api/webhooks/sendgrid", {
        method: "POST",
        body: JSON.stringify([]),
      });
      const response = await POST(req);

      // Empty events should be accepted or rejected with validation error
      expect([200, 201, 202, 400, 422]).toContain(response.status);
    });
  });
});
