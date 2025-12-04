import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireSuperAdmin: vi.fn().mockResolvedValue({ id: "super", tenantId: "org-1" }),
}));
vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  buildOrgAwareRateLimitKey: vi.fn(() => "rl-key"),
}));

import { GET, POST } from "@/app/api/qa/health/route";
import { requireSuperAdmin } from "@/lib/authz";
import { smartRateLimit } from "@/server/security/rateLimit";

type NextRequestLike = {
  url: string;
  ip?: string | null;
  headers?: { get: (key: string) => string | null };
  cookies?: { get: (key: string) => { value: string } | undefined };
};

function createRequest(): NextRequestLike {
  return {
    url: "http://localhost/api/qa/health",
    ip: "127.0.0.1",
    headers: { get: () => null },
    cookies: { get: () => undefined },
  };
}

describe("api/qa/health route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.mocked(requireSuperAdmin).mockResolvedValue({ id: "super", tenantId: "org-1" });
    vi.mocked(smartRateLimit).mockResolvedValue({ allowed: true });
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).__connectToDatabaseMock;
  });

  it("returns 400 when tenantId is missing", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue({ id: "super", tenantId: "" });

    const res = await GET(createRequest() as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing organization context");
  });

  it("returns healthy when DB connection succeeds", async () => {
    (globalThis as Record<string, unknown>).__connectToDatabaseMock = async () => ({
      connection: { db: { listCollections: () => ({ toArray: async () => [] }) } },
    });

    const res = await GET(createRequest() as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(typeof body.database).toBe("string");
    expect(body.database.startsWith("connected")).toBe(true);
  });

  it("returns 503 critical when DB connection fails", async () => {
    (globalThis as Record<string, unknown>).__connectToDatabaseMock = async () => {
      throw new Error("db down");
    };

    const res = await GET(createRequest() as any);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("critical");
    expect(body.database).toBe("disconnected");
  });

  it("POST reconnect returns success when DB connects", async () => {
    (globalThis as Record<string, unknown>).__connectToDatabaseMock = async () => ({
      connection: {},
    });

    const res = await POST(createRequest() as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toMatch(/Database reconnected/i);
  });

  it("POST reconnect returns 500 when DB connection fails", async () => {
    (globalThis as Record<string, unknown>).__connectToDatabaseMock = async () => {
      throw new Error("cannot connect");
    };

    const res = await POST(createRequest() as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to reconnect database");
  });
});
