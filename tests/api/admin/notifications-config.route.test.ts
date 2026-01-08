/**
 * @fileoverview Tests for /api/admin/notifications/config
 * Sprint 32: Admin coverage improvement
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/notifications/config/route";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
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

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));

import { auth } from "@/auth";
import { smartRateLimit } from "@/server/security/rateLimit";

describe("GET /api/admin/notifications/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore mocks
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@test.com", role: "SUPER_ADMIN", orgId: "org-1" },
      expires: "2099-01-01",
    });
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true, remaining: 19, retryAfter: 0 });
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(smartRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfter: 60 });

    const req = new NextRequest("http://localhost/api/admin/notifications/config");
    const res = await GET(req);

    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost/api/admin/notifications/config");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("returns 403 when not SUPER_ADMIN", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "test@test.com", role: "USER", orgId: "org-1" },
      expires: "2099-01-01",
    });

    const req = new NextRequest("http://localhost/api/admin/notifications/config");
    const res = await GET(req);

    expect(res.status).toBe(403);
  });
});
