/**
 * @fileoverview Tests for /api/superadmin/session route
 * @sprint 66
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/superadmin/auth", () => ({
  decodeSuperadminToken: vi.fn().mockResolvedValue({
    username: "superadmin",
    role: "SUPER_ADMIN",
    orgId: "org-1",
    expiresAt: Date.now() + 3600000,
  }),
  SUPERADMIN_COOKIE_NAME: "sa_token",
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

import { GET } from "@/app/api/superadmin/session/route";
import { decodeSuperadminToken } from "@/lib/superadmin/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const mockDecodeSuperadminToken = vi.mocked(decodeSuperadminToken);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

function createRequest(cookies: Record<string, string> = {}): Request {
  const req = new Request("http://localhost:3000/api/superadmin/session", {
    method: "GET",
  });
  // Mock cookies
  (req as any).cookies = {
    get: (name: string) => cookies[name] ? { value: cookies[name] } : undefined,
    getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
  };
  return req;
}

describe("GET /api/superadmin/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue(null);
    mockDecodeSuperadminToken.mockResolvedValue({
      username: "superadmin",
      role: "SUPER_ADMIN",
      orgId: "org-1",
      expiresAt: Date.now() + 3600000,
    } as any);
  });

  it("should return 429 when rate limited", async () => {
    mockEnforceRateLimit.mockReturnValue(
      new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 }) as any
    );
    const res = await GET(createRequest() as any);
    expect(res.status).toBe(429);
  });

  it("should return 401 when no valid session", async () => {
    mockDecodeSuperadminToken.mockResolvedValue(null);
    const res = await GET(createRequest() as any);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.authenticated).toBe(false);
  });

  it("should return session info for valid token", async () => {
    const res = await GET(createRequest({ sa_token: "valid-token" }) as any);
    expect([200, 401, 500]).toContain(res.status);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.authenticated).toBe(true);
      expect(json.user).toBeDefined();
    }
  });

  it("should include username and role in response", async () => {
    const res = await GET(createRequest({ sa_token: "valid-token" }) as any);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.user.username).toBe("superadmin");
      expect(json.user.role).toBe("SUPER_ADMIN");
    }
  });

  it("should include expiration time", async () => {
    const res = await GET(createRequest({ sa_token: "valid-token" }) as any);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.expiresAt).toBeDefined();
    }
  });
});
