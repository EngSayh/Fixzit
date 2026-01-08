/**
 * @fileoverview Tests for /api/admin/billing/benchmark
 * Sprint 32: Admin coverage improvement
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/billing/benchmark/route";

// Mock dependencies
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/models/Benchmark", () => ({
  default: {
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
}));

vi.mock("@/lib/authz", () => ({
  requireSuperAdmin: vi.fn(),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(),
  buildOrgAwareRateLimitKey: vi.fn().mockReturnValue("test-key"),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
  ),
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: vi.fn((data, status) => 
    new Response(JSON.stringify(data), { status })
  ),
}));

import { requireSuperAdmin } from "@/lib/authz";
import { smartRateLimit } from "@/server/security/rateLimit";

describe("GET /api/admin/billing/benchmark", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore mocks
    vi.mocked(requireSuperAdmin).mockResolvedValue({ id: "user-1", tenantId: "org-1" });
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true, remaining: 99, retryAfter: 0 });
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(smartRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfter: 60 });

    const req = new NextRequest("http://localhost/api/admin/billing/benchmark");
    const res = await GET(req);

    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireSuperAdmin).mockRejectedValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );

    const req = new NextRequest("http://localhost/api/admin/billing/benchmark");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("returns 400 when missing organization context", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValueOnce({ id: "user-1", tenantId: "" });

    const req = new NextRequest("http://localhost/api/admin/billing/benchmark");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("organization");
  });
});
