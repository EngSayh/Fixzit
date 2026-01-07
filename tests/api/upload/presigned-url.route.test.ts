/**
 * @fileoverview Tests for /api/upload/presigned-url route
 * Tests authentication, validation, rate limiting, and presigned URL generation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  setMockUser,
  clearMockUser,
  mockSessionUser,
} from "@/tests/helpers/mockAuth";

// Mock session via getSessionUser
vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn(async () => {
    if (!mockSessionUser) return null;
    return mockSessionUser;
  }),
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

vi.mock("@/server/security/rateLimitKey", () => ({
  buildOrgAwareRateLimitKey: vi.fn(() => "test-rate-key"),
}));

// Mock S3 config
let s3Configured = true;
vi.mock("@/lib/storage/s3-config", () => {
  class S3NotConfiguredError extends Error {
    name = "S3NotConfiguredError";
    constructor(message = "S3 not configured") {
      super(message);
    }
    toJSON() {
      return { error: this.message };
    }
  }
  return {
    assertS3Configured: vi.fn(() => {
      if (!s3Configured) {
        throw new S3NotConfiguredError("S3 not configured");
      }
    }),
    S3NotConfiguredError,
    buildS3Key: vi.fn(() => "test-org/uploads/test-file.pdf"),
  };
});

// Mock S3 presigned URL
vi.mock("@/lib/storage/s3", () => ({
  getPresignedPutUrl: vi.fn().mockResolvedValue({
    url: "https://s3.example.com/presigned-url",
    key: "test-org/uploads/test-file.pdf",
  }),
}));

// Mock secure response
vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((body, status) => {
    return new Response(JSON.stringify(body), { status });
  }),
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

// Mock config
vi.mock("@/lib/config/constants", () => ({
  Config: {
    APP_URL: "http://localhost:3000",
    aws: {
      scan: {
        required: false,
        endpoint: null,
      },
    },
  },
}));

// Mock parseBodySafe
vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      fileName: "test.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      category: "document",
    },
  }),
}));

import { POST } from "@/app/api/upload/presigned-url/route";

// Use sequential to prevent race conditions from module-level mutable state (rateLimitAllowed, s3Configured)
describe.sequential("API /api/upload/presigned-url", () => {
  beforeEach(() => {
    rateLimitAllowed = true;
    s3Configured = true;
    clearMockUser();
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      setMockUser(null);

      const req = new NextRequest(
        "http://localhost:3000/api/upload/presigned-url",
        {
          method: "POST",
          body: JSON.stringify({
            fileName: "test.pdf",
            fileType: "application/pdf",
            fileSize: 1024,
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 400 when user has no orgId (tenant context required)", async () => {
      setMockUser({
        id: "user-123",
        orgId: undefined,
        role: "ADMIN",
        email: "test@example.com",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/upload/presigned-url",
        {
          method: "POST",
          body: JSON.stringify({
            fileName: "test.pdf",
            fileType: "application/pdf",
            fileSize: 1024,
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      // Route returns 400 for missing orgId (tenant context required)
      expect(res.status).toBe(400);
    });
  });

  describe("Rate Limiting", () => {
    it("returns 429 when rate limited", async () => {
      rateLimitAllowed = false;
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        role: "ADMIN",
        email: "test@example.com",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/upload/presigned-url",
        {
          method: "POST",
          body: JSON.stringify({
            fileName: "test.pdf",
            fileType: "application/pdf",
            fileSize: 1024,
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      expect(res.status).toBe(429);
    });
  });

  describe("S3 Configuration", () => {
    it("returns 503 when S3 is not configured", async () => {
      s3Configured = false;
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        role: "ADMIN",
        email: "test@example.com",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/upload/presigned-url",
        {
          method: "POST",
          body: JSON.stringify({
            fileName: "test.pdf",
            fileType: "application/pdf",
            fileSize: 1024,
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      // Expected: 503 Service Unavailable when S3 is not configured
      expect(res.status).toBe(503);
    });
  });

  describe("Validation", () => {
    it("returns 400 for unsupported content type", async () => {
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        role: "ADMIN",
        email: "test@example.com",
      });

      // Override parseBodySafe for this test
      const { parseBodySafe } = await import("@/lib/api/parse-body");
      (parseBodySafe as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        data: {
          fileName: "test.exe",
          fileType: "application/x-executable",
          fileSize: 1024,
          category: "document",
        },
      });

      const req = new NextRequest(
        "http://localhost:3000/api/upload/presigned-url",
        {
          method: "POST",
          body: JSON.stringify({
            fileName: "test.exe",
            fileType: "application/x-executable",
            fileSize: 1024,
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      // Expected: 400 for validation error (unsupported content type)
      expect(res.status).toBe(400);
    });
  });

  describe("Success Cases", () => {
    it("returns presigned URL for valid PDF upload", async () => {
      setMockUser({
        id: "user-123",
        orgId: "org-123",
        role: "ADMIN",
        email: "test@example.com",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/upload/presigned-url",
        {
          method: "POST",
          body: JSON.stringify({
            fileName: "test.pdf",
            fileType: "application/pdf",
            fileSize: 1024,
            category: "document",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await POST(req);

      // Expected: 200 for success with presigned URL
      expect(res.status).toBe(200);
    });
  });
});
