import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockSmartRateLimit = vi.fn();

vi.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: (...args: unknown[]) => mockSmartRateLimit(...args),
}));

vi.mock("@/server/security/headers", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { GET } from "@/app/api/auth/me/route";
import { NextRequest } from "next/server";

function createRequest(): NextRequest {
  return new NextRequest("http://localhost/api/auth/me", {
    method: "GET",
    headers: { "x-forwarded-for": "127.0.0.1" },
  });
}

describe("auth/me route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSmartRateLimit.mockResolvedValue({ allowed: true, remaining: 100 });
  });

  it("returns guest payload when no session exists", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const req = createRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ authenticated: false, user: null });
  });

  it("returns user payload when session is present", async () => {
    mockAuth.mockResolvedValueOnce({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        role: "TENANT",
        orgId: "org-1",
        permissions: ["read"],
        isSuperAdmin: false,
      },
    });

    const req = createRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.authenticated).toBe(true);
    expect(body.user).toMatchObject({
      id: "user-1",
      email: "user@example.com",
      role: "TENANT",
      orgId: "org-1",
    });
  });
});
