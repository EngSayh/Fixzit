/**
 * @fileoverview Tests for /api/auth/mfa/verify
 * Sprint 34: Auth coverage improvement
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/mfa/verify/route";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/auth/mfaService", () => ({
  verifyMFACode: vi.fn().mockResolvedValue({ success: true }),
  MFAMethod: { TOTP: "TOTP", RECOVERY: "RECOVERY" },
  trustDevice: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { auth } from "@/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

describe("POST /api/auth/mfa/verify", () => {
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

    const req = new NextRequest("http://localhost/api/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ code: "123456" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost/api/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ code: "123456" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("FIXZIT-AUTH-001");
  });

  it("returns 400 when code is missing", async () => {
    const req = new NextRequest("http://localhost/api/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toContain("code");
  });

  it("returns 400 when orgId is missing", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "test@test.com" },
      expires: "2099-01-01",
    });

    const req = new NextRequest("http://localhost/api/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ code: "123456" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("FIXZIT-TENANT-001");
  });
});
