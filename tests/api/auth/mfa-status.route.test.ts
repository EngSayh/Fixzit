/**
 * @fileoverview Tests for /api/auth/mfa/status
 * Sprint 34: Auth coverage improvement
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/auth/mfa/status/route";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/auth/mfaService", () => ({
  getMFAStatus: vi.fn().mockResolvedValue({ enabled: false, method: null }),
  disableMFA: vi.fn().mockResolvedValue({ success: true }),
  regenerateRecoveryCodes: vi.fn().mockResolvedValue({ codes: ["abc", "def"] }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { auth } from "@/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

describe("GET /api/auth/mfa/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore mocks
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@test.com", orgId: "org-1" },
      expires: "2099-01-01",
    });
    vi.mocked(enforceRateLimit).mockReturnValue(null);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(enforceRateLimit).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    );

    const req = new NextRequest("http://localhost/api/auth/mfa/status");
    const res = await GET(req);

    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost/api/auth/mfa/status");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("FIXZIT-AUTH-001");
  });

  it("returns 403 when orgId is missing", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "test@test.com" },
      expires: "2099-01-01",
    });

    const req = new NextRequest("http://localhost/api/auth/mfa/status");
    const res = await GET(req);

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("FIXZIT-TENANT-001");
  });
});
