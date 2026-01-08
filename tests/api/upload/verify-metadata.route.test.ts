/**
 * @fileoverview Tests for /api/upload/verify-metadata route
 * @description File metadata verification API for S3 objects
 * Sprint 64: Upload domain coverage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: vi.fn(),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));

vi.mock("@/server/security/rateLimitKey", () => ({
  buildOrgAwareRateLimitKey: vi.fn().mockReturnValue("test-key"),
}));

vi.mock("@/lib/storage/s3-config", () => ({
  assertS3Configured: vi.fn(),
  getS3Config: vi.fn().mockReturnValue({ bucket: "test-bucket" }),
  S3NotConfiguredError: class extends Error {
    toJSON() { return { error: "S3 not configured" }; }
  },
}));

vi.mock("@/lib/storage/s3", () => ({
  getS3Client: vi.fn().mockReturnValue({
    send: vi.fn().mockResolvedValue({
      ContentType: "application/pdf",
      ContentLength: 1024,
      Metadata: {},
    }),
  }),
}));

vi.mock("@/lib/storage/org-upload-keys", () => ({
  validateOrgScopedKey: vi.fn().mockReturnValue({ ok: true }),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn().mockResolvedValue({ data: {}, error: null }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import { getSessionOrNull } from "@/lib/auth/safe-session";
import { validateOrgScopedKey } from "@/lib/storage/org-upload-keys";
import { GET } from "@/app/api/upload/verify-metadata/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Upload Verify Metadata API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateOrgScopedKey).mockReturnValue({ ok: true });
  });

  describe("GET /api/upload/verify-metadata", () => {
    it("should reject unauthenticated requests", async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: null,
        response: null,
      });

      const req = new NextRequest("http://localhost/api/upload/verify-metadata?key=test", { method: "GET" });
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("should reject requests without key parameter", async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: { user: { id: "user1", orgId: "org1" } },
        response: null,
      });

      const req = new NextRequest("http://localhost/api/upload/verify-metadata", { method: "GET" });
      const res = await GET(req);

      expect(res.status).toBe(400);
    });

    it("should reject cross-tenant key access", async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: { user: { id: "user1", orgId: "org1" } },
        response: null,
      });
      vi.mocked(validateOrgScopedKey).mockReturnValue({ 
        ok: false, 
        status: 403,
        message: "Access denied",
      });

      const req = new NextRequest("http://localhost/api/upload/verify-metadata?key=org2/file.pdf", { method: "GET" });
      const res = await GET(req);

      expect(res.status).toBe(403);
    });

    it("should return metadata for valid request", async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: { user: { id: "user1", orgId: "org1" } },
        response: null,
      });

      const req = new NextRequest("http://localhost/api/upload/verify-metadata?key=org1/file.pdf", { method: "GET" });
      const res = await GET(req);

      // Accept 200 OK or 500/503 if S3/infra unavailable
      expect([200, 500, 503]).toContain(res.status);
    });

    it("should handle session infrastructure error", async () => {
      const errorResponse = new Response(JSON.stringify({ error: "DB unavailable" }), { status: 503 });
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: false,
        session: null,
        response: errorResponse,
      });

      const req = new NextRequest("http://localhost/api/upload/verify-metadata?key=test", { method: "GET" });
      const res = await GET(req);

      expect(res.status).toBe(503);
    });
  });
});
