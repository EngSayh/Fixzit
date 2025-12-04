import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireSuperAdmin: vi.fn().mockResolvedValue({ id: "super", tenantId: "org-1" }),
}));
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  buildOrgAwareRateLimitKey: vi.fn(() => "rl-key"),
}));
vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue({ connection: {} }),
}));

import { POST } from "@/app/api/qa/reconnect/route";
import { requireSuperAdmin } from "@/lib/authz";
import { smartRateLimit } from "@/server/security/rateLimit";
import { connectToDatabase } from "@/lib/mongodb-unified";

type NextRequestLike = {
  url: string;
  ip?: string | null;
  headers?: { get: (key: string) => string | null };
  cookies?: { get: () => { value: string } | undefined };
};

function createRequest(): NextRequestLike {
  return {
    url: "http://localhost/api/qa/reconnect",
    ip: "127.0.0.1",
    headers: { get: () => null },
    cookies: { get: () => undefined },
  };
}

describe("api/qa/reconnect route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.mocked(requireSuperAdmin).mockResolvedValue({ id: "super", tenantId: "org-1" });
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(connectToDatabase).mockResolvedValue({ connection: {} } as any);
  });

  it("returns 400 when tenantId is missing", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue({ id: "super", tenantId: "" });

    const res = await POST(createRequest() as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing organization context");
  });

  it("returns success when reconnection succeeds", async () => {
    const res = await POST(createRequest() as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toMatch(/reconnected/i);
    expect(connectToDatabase).toHaveBeenCalled();
  });

  it("returns 500 when reconnection fails", async () => {
    vi.mocked(connectToDatabase).mockRejectedValue(new Error("db down"));

    const res = await POST(createRequest() as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Database reconnection failed");
  });
});
