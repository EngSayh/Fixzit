import { describe, it, expect, vi, beforeEach } from "vitest";

const enforceRateLimitMock = vi.fn();
const insertOneMock = vi.fn();

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
  getDatabase: vi.fn().mockResolvedValue({
    collection: () => ({ insertOne: insertOneMock }),
  }),
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

describe("POST /api/trial-request", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    enforceRateLimitMock.mockReturnValue(null);
    insertOneMock.mockResolvedValue({});
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
});
