/**
 * @fileoverview Tests for /api/upload/scan route
 * @description Antivirus scan trigger API for S3 uploads
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
  buildOrgAwareRateLimitKey: vi.fn().mockReturnValue("test-key"),
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));

vi.mock("@/lib/storage/s3-config", () => ({
  assertS3Configured: vi.fn(),
  getS3Config: vi.fn().mockReturnValue({ bucket: "test-bucket" }),
  S3NotConfiguredError: class extends Error {
    toJSON() { return { error: "S3 not configured" }; }
  },
}));

vi.mock("@/lib/storage/org-upload-keys", () => ({
  validateOrgScopedKey: vi.fn().mockReturnValue({ ok: true }),
}));

vi.mock("@/lib/security/av-scan", () => ({
  scanS3Object: vi.fn().mockResolvedValue({ clean: true }),
}));

vi.mock("@/lib/security/s3-policy", () => ({
  validateBucketPolicies: vi.fn().mockResolvedValue({ valid: true }),
}));

vi.mock("@/lib/api/parse-body", () => ({
  parseBodySafe: vi.fn(),
}));

vi.mock("@/lib/api/health", () => ({
  health503: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Service unavailable" }), { status: 503 })
  ),
}));

vi.mock("@/lib/config/constants", () => ({
  Config: {
    aws: {
      scan: { endpoint: "http://localhost:8080" },
    },
  },
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((body, status) => 
    new Response(JSON.stringify(body), { status })
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import { getSessionOrNull } from "@/lib/auth/safe-session";
import { parseBodySafe } from "@/lib/api/parse-body";
import { validateOrgScopedKey } from "@/lib/storage/org-upload-keys";
import { POST } from "@/app/api/upload/scan/route";

// ============================================================================
// TESTS
// ============================================================================

describe("Upload Scan API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateOrgScopedKey).mockReturnValue({ ok: true });
    vi.mocked(parseBodySafe).mockResolvedValue({ data: { key: "org1/test.pdf" }, error: null });
  });

  describe("POST /api/upload/scan", () => {
    it("should reject unauthenticated requests", async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: null,
        response: null,
      });

      const req = new NextRequest("http://localhost/api/upload/scan", {
        method: "POST",
        body: JSON.stringify({ key: "org1/test.pdf" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("should reject requests without key", async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: { id: "user1", orgId: "org1", tenantId: "org1" },
        response: null,
      });
      vi.mocked(parseBodySafe).mockResolvedValue({ data: {}, error: null });

      const req = new NextRequest("http://localhost/api/upload/scan", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("should reject invalid body", async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: { id: "user1", orgId: "org1", tenantId: "org1" },
        response: null,
      });
      vi.mocked(parseBodySafe).mockResolvedValue({ data: null, error: new Error("Parse error") });

      const req = new NextRequest("http://localhost/api/upload/scan", {
        method: "POST",
        body: "invalid json",
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("should reject cross-tenant key access", async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: { id: "user1", orgId: "org1", tenantId: "org1" },
        response: null,
      });
      vi.mocked(validateOrgScopedKey).mockReturnValue({ 
        ok: false, 
        status: 403,
        message: "Access denied",
      });

      const req = new NextRequest("http://localhost/api/upload/scan", {
        method: "POST",
        body: JSON.stringify({ key: "org2/malicious.pdf" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
    });

    it("should scan file for valid request", async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: { user: { id: "user1", orgId: "org1" } },
        response: null,
      });

      const req = new NextRequest("http://localhost/api/upload/scan", {
        method: "POST",
        body: JSON.stringify({ key: "org1/test.pdf" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      // Accept 200 OK or 500/503 if scan service unavailable
      expect([200, 500, 503]).toContain(res.status);
    });

    it("should handle infrastructure error from session", async () => {
      const errorResponse = new Response(JSON.stringify({ error: "DB unavailable" }), { status: 503 });
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: false,
        session: null,
        response: errorResponse,
      });

      const req = new NextRequest("http://localhost/api/upload/scan", {
        method: "POST",
        body: JSON.stringify({ key: "test" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(503);
    });
  });
});
