/**
 * @fileoverview Tests for /api/fm/providers
 * Sprint 33: FM Core coverage improvement
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/fm/providers/route";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
      countDocuments: vi.fn().mockResolvedValue(0),
    }),
  }),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(),
}));

vi.mock("@/lib/superadmin/auth", () => ({
  getSuperadminSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/services/fm/provider-network", () => ({
  getProviderStatistics: vi.fn().mockResolvedValue({ total_providers: 0 }),
  getFeaturedProviders: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { auth } from "@/auth";
import { smartRateLimit } from "@/server/security/rateLimit";

describe("GET /api/fm/providers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore mocks
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@test.com", orgId: "org-1" },
      expires: "2099-01-01",
    });
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true, remaining: 59, retryAfter: 0 });
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(smartRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: 60000 });

    const req = new NextRequest("http://localhost/api/fm/providers");
    const res = await GET(req);

    expect(res.status).toBe(429);
  });

  it("returns 400 when authenticated user missing orgId", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "test@test.com" },
      expires: "2099-01-01",
    });

    const req = new NextRequest("http://localhost/api/fm/providers");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error?.code).toBe("FIXZIT-TENANT-001");
  });
});
