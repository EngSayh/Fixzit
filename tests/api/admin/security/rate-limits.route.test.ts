/**
 * @fileoverview Tests for Admin Security Rate Limits Route
 * @route GET /api/admin/security/rate-limits
 * @sprint Sprint 36
 * @agent [AGENT-680-FULL]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before imports
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/security/monitoring", () => ({
  getSecurityMetrics: vi.fn(() => ({
    windowMs: 60000,
    rateLimitHits: 150,
    rateLimitUniqueKeys: 42,
  })),
  getRateLimitBreakdown: vi.fn(() => ({
    "/api/auth/login": 50,
    "/api/fm/work-orders": 30,
  })),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/server/security/rateLimit", () => ({
  getRateLimitMetrics: vi.fn(() => ({
    entries: 100,
    maxEntries: 10000,
  })),
}));

import { GET } from "@/app/api/admin/security/rate-limits/route";
import { auth } from "@/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { NextResponse } from "next/server";

const mockAuth = vi.mocked(auth);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("GET /api/admin/security/rate-limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/admin/security/rate-limits");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when not SUPER_ADMIN", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@test.com",
        role: "ADMIN",
        orgId: "org-1",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const req = new NextRequest("http://localhost/api/admin/security/rate-limits");
    const res = await GET(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Forbidden");
  });

  it("returns rate limit metrics for SUPER_ADMIN", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@test.com",
        role: "SUPER_ADMIN",
        orgId: "org-1",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const req = new NextRequest("http://localhost/api/admin/security/rate-limits");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("windowMs");
    expect(body).toHaveProperty("totalHits");
    expect(body).toHaveProperty("endpoints");
    expect(body).toHaveProperty("store");
    expect(body).toHaveProperty("generatedAt");
  });

  it("enforces rate limiting", async () => {
    mockEnforceRateLimit.mockReturnValue(
      NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    );

    const req = new NextRequest("http://localhost/api/admin/security/rate-limits");
    const res = await GET(req);

    expect(res.status).toBe(429);
  });
});
