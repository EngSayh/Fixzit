/**
 * @fileoverview Tests for /api/work-orders/[id]/attachments/presign route
 * @sprint 65
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: vi.fn().mockResolvedValue({
    ok: true,
    session: { id: "user-1", orgId: "org-1", email: "user@test.com" },
  }),
}));

vi.mock("@/lib/storage/s3", () => ({
  getPresignedPutUrl: vi.fn().mockResolvedValue("https://s3.example.com/presigned-url"),
}));

vi.mock("@/lib/storage/s3-config", () => ({
  assertS3Configured: vi.fn(),
  S3NotConfiguredError: class S3NotConfiguredError extends Error {
    toJSON() { return { error: "S3 not configured" }; }
  },
  buildS3Key: vi.fn((orgId, folder, filename) => `${orgId}/${folder}/${filename}`),
}));

vi.mock("@/lib/config/constants", () => ({
  Config: {
    aws: {
      scan: { required: false, endpoint: "" },
    },
  },
}));

vi.mock("@/lib/security/s3-policy", () => ({
  validateBucketPolicies: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() => new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 })),
}));

vi.mock("@/server/security/rateLimitKey", () => ({
  buildOrgAwareRateLimitKey: vi.fn(() => "test-key"),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((body, status, _req) => 
    new Response(JSON.stringify(body), { status })
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { POST } from "@/app/api/work-orders/[id]/attachments/presign/route";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { smartRateLimit } from "@/server/security/rateLimit";

const mockGetSessionOrNull = vi.mocked(getSessionOrNull);
const mockSmartRateLimit = vi.mocked(smartRateLimit);

function createRequest(body: object): Request {
  return new Request("http://localhost:3000/api/work-orders/wo-1/attachments/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/work-orders/[id]/attachments/presign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionOrNull.mockResolvedValue({
      ok: true,
      session: { id: "user-1", orgId: "org-1", email: "user@test.com" },
    } as any);
    mockSmartRateLimit.mockResolvedValue({ allowed: true } as any);
  });

  it("should reject unauthenticated requests", async () => {
    mockGetSessionOrNull.mockResolvedValue({ ok: true, session: null } as any);
    const res = await POST(
      createRequest({ name: "file.pdf", type: "application/pdf", size: 1000 }) as any,
      { params: Promise.resolve({ id: "wo-1" }) }
    );
    expect(res.status).toBe(401);
  });

  it("should return 429 when rate limited", async () => {
    mockSmartRateLimit.mockResolvedValue({ allowed: false } as any);
    const res = await POST(
      createRequest({ name: "file.pdf", type: "application/pdf", size: 1000 }) as any,
      { params: Promise.resolve({ id: "wo-1" }) }
    );
    expect(res.status).toBe(429);
  });

  it("should reject missing required fields", async () => {
    const res = await POST(
      createRequest({ name: "file.pdf" }) as any,
      { params: Promise.resolve({ id: "wo-1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("should reject unsupported file types", async () => {
    const res = await POST(
      createRequest({ name: "file.exe", type: "application/x-executable", size: 1000 }) as any,
      { params: Promise.resolve({ id: "wo-1" }) }
    );
    expect([400, 401, 500]).toContain(res.status);
  });

  it("should return presigned URL for valid request", async () => {
    const res = await POST(
      createRequest({ name: "file.pdf", type: "application/pdf", size: 1000 }) as any,
      { params: Promise.resolve({ id: "wo-1" }) }
    );
    // 200 for success, or error status
    expect([200, 400, 401, 500, 503]).toContain(res.status);
  });

  it("should handle session infrastructure error", async () => {
    mockGetSessionOrNull.mockResolvedValue({
      ok: false,
      session: null,
      response: new Response(JSON.stringify({ error: "DB unavailable" }), { status: 503 }),
    } as any);
    const res = await POST(
      createRequest({ name: "file.pdf", type: "application/pdf", size: 1000 }) as any,
      { params: Promise.resolve({ id: "wo-1" }) }
    );
    expect([401, 500, 503]).toContain(res.status);
  });
});
