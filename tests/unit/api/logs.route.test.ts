import { describe, it, expect, beforeEach, vi } from "vitest";

type SessionUser = {
  id?: string;
  email?: string;
  tenantId?: string;
};
let sessionUser: SessionUser | null = null;

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => {
    if (!sessionUser) return null;
    return { user: sessionUser };
  }),
}));
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  buildOrgAwareRateLimitKey: vi.fn(() => "rl-key"),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { POST } from "@/app/api/logs/route";
import { smartRateLimit } from "@/server/security/rateLimit";

type NextRequestLike = {
  url: string;
  headers: { get: (key: string) => string | null };
  json: () => Promise<any>;
};

function createRequest(body: any): NextRequestLike {
  return {
    url: "http://localhost/api/logs",
    headers: { get: () => null },
    json: async () => body,
  };
}

describe("api/logs route", () => {
  beforeEach(() => {
    sessionUser = { id: "user-1", email: "a@test.com", tenantId: "org-1" };
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
  });

  it("rejects when unauthorized", async () => {
    sessionUser = null;
    const res = await POST(createRequest({ level: "info", message: "m" }) as any);
    expect(res.status).toBe(401);
  });

  it("rejects when org context is missing", async () => {
    sessionUser = { id: "user-1", email: "a@test.com" };
    const res = await POST(createRequest({ level: "info", message: "m" }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing organization context");
  });

  it("rate limits when not allowed", async () => {
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: false });
    const res = await POST(createRequest({ level: "info", message: "m" }) as any);
    expect(res.status).toBe(429);
  });

  it("rejects invalid level", async () => {
    const res = await POST(createRequest({ level: "debug", message: "m" }) as any);
    expect(res.status).toBe(400);
  });

  it("rejects oversized context", async () => {
    const big = "x".repeat(9000);
    const res = await POST(createRequest({ level: "info", message: "m", context: { big } }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Context too large");
  });

  it("accepts valid request", async () => {
    const res = await POST(createRequest({ level: "info", message: "ok", context: { a: 1 } }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
