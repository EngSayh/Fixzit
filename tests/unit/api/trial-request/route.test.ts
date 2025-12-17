import { describe, it, expect, vi, beforeEach } from "vitest";

const enforceRateLimitMock = vi.fn();
const smartRateLimitMock = vi.fn();
const insertOneMock = vi.fn();
const connectToDatabaseMock = vi.fn();
const getDatabaseMock = vi.fn();
const loggerErrorMock = vi.fn();

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: smartRateLimitMock,
  buildOrgAwareRateLimitKey: vi.fn(() => "test-key"),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: connectToDatabaseMock,
  getDatabase: getDatabaseMock,
}));

vi.mock("@/server/security/headers", async (orig) => {
  const actual = await orig<typeof import("@/server/security/headers")>();
  return {
    ...actual,
    getClientIP: () => "10.0.0.1",
  };
});

vi.mock("next/server", () => {
  class MockNextRequest {
    url: string;
    headers: Headers;
    private body: unknown;
    constructor(url: string | URL, body: unknown) {
      this.url = url.toString();
      this.body = body;
      this.headers = new Headers({ "user-agent": "jest" });
    }
    async json() {
      return this.body;
    }
  }
  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: (body: unknown, init?: ResponseInit) => ({
        body,
        status: init?.status ?? 200,
      }),
    },
  };
});

vi.mock("@/lib/logger", () => ({
  logger: {
    error: loggerErrorMock,
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe("POST /api/trial-request", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    enforceRateLimitMock.mockReturnValue(null);
    smartRateLimitMock.mockResolvedValue({ allowed: true, remaining: 10 });
    insertOneMock.mockResolvedValue({});
    connectToDatabaseMock.mockResolvedValue(undefined);
    getDatabaseMock.mockResolvedValue({
      collection: () => ({ insertOne: insertOneMock }),
    });
  });

  it("rejects via honeypot without persisting", async () => {
    const { POST } = await import("@/app/api/trial-request/route");
    const mod = await import("next/server");
    const req = new (mod.NextRequest as any)("https://example.com/api/trial-request", {
      name: "User",
      email: "user@example.com",
      company: "Co",
      website: "bot", // honeypot
    });

    const res = (await POST(req)) as { status: number };
    expect(res.status).toBe(200);
    expect(insertOneMock).not.toHaveBeenCalled();
  });

  it("rate limits per email", async () => {
    const limitResponse = { status: 429 };
    enforceRateLimitMock
      .mockReturnValueOnce(null) // IP-based
      .mockReturnValueOnce(limitResponse); // email-based

    const { POST } = await import("@/app/api/trial-request/route");
    const mod = await import("next/server");
    const req = new (mod.NextRequest as any)("https://example.com/api/trial-request", {
      name: "User",
      email: "user@example.com",
      company: "Co",
    });

    const res = (await POST(req)) as { status: number };
    expect(res).toBe(limitResponse);
    expect(insertOneMock).not.toHaveBeenCalled();
    expect(enforceRateLimitMock).toHaveBeenCalledTimes(2);
  });

  it("returns 503 when database is unavailable", async () => {
    connectToDatabaseMock.mockRejectedValueOnce(new Error("db down"));

    const { POST } = await import("@/app/api/trial-request/route");
    const mod = await import("next/server");
    const req = new (mod.NextRequest as any)("https://example.com/api/trial-request", {
      name: "User",
      email: "user@example.com",
      company: "Co",
    });

    const res = (await POST(req)) as { status: number; body: unknown };
    expect(res.status).toBe(503);
    expect(loggerErrorMock).toHaveBeenCalledWith(
      "[trial-request] DB persistence failed",
      expect.objectContaining({
        email: "user@example.com",
        company: "Co",
      }),
    );
    expect(insertOneMock).not.toHaveBeenCalled();
  });
});
