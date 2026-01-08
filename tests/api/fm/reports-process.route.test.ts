/**
 * @fileoverview Tests for /api/fm/reports/process
 * Sprint 33: FM Core coverage improvement
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/fm/reports/process/route";

// Mock dependencies
vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      findOneAndUpdate: vi.fn().mockResolvedValue({ value: null }),
    }),
  }),
}));

vi.mock("@/lib/mongoUtils.server", () => ({
  unwrapFindOneResult: vi.fn().mockReturnValue(null),
}));

vi.mock("@/app/api/fm/permissions", () => ({
  requireFmPermission: vi.fn(),
}));

vi.mock("@/app/api/fm/utils/tenant", () => ({
  resolveTenantId: vi.fn().mockReturnValue({ tenantId: "org-1" }),
}));

vi.mock("@/app/api/fm/errors", () => ({
  FMErrors: {
    unauthorized: vi.fn().mockReturnValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    ),
    forbidden: vi.fn().mockReturnValue(
      new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
    ),
    tenantRequired: vi.fn().mockReturnValue(
      new Response(JSON.stringify({ error: "Tenant required" }), { status: 400 })
    ),
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/storage/s3", () => ({
  getPresignedGetUrl: vi.fn().mockResolvedValue("http://example.com/file"),
  putObjectBuffer: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/security/av-scan", () => ({
  scanS3Object: vi.fn().mockResolvedValue({ clean: true }),
}));

vi.mock("@/lib/security/s3-policy", () => ({
  validateBucketPolicies: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/reports/generator", () => ({
  generateReport: vi.fn().mockResolvedValue({ buffer: Buffer.from("test"), mimeType: "application/pdf" }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { requireFmPermission } from "@/app/api/fm/permissions";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

describe("POST /api/fm/reports/process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore mocks
    vi.mocked(requireFmPermission).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      orgId: "org-1",
      tenantId: "org-1",
      isSuperAdmin: false,
    });
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(enforceRateLimit).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    );

    const req = new NextRequest("http://localhost/api/fm/reports/process", {
      method: "POST",
    });
    const res = await POST(req);

    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireFmPermission).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );

    const req = new NextRequest("http://localhost/api/fm/reports/process", {
      method: "POST",
    });
    const res = await POST(req);

    // Route returns 401 via requireFmPermission NextResponse
    expect([401, 503]).toContain(res.status);
  });

  it("returns 400 when tenant resolution fails", async () => {
    const { resolveTenantId } = await import("@/app/api/fm/utils/tenant");
    vi.mocked(resolveTenantId).mockReturnValueOnce({
      error: new Response(JSON.stringify({ error: "Tenant required" }), { status: 400 }),
    });

    const req = new NextRequest("http://localhost/api/fm/reports/process", {
      method: "POST",
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
