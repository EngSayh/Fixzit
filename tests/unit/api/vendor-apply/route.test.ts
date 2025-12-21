import { describe, it, expect, vi, beforeEach } from "vitest";

const enforceRateLimitMock = vi.fn();
const connectToDatabaseMock = vi.fn();
const loggerErrorMock = vi.fn();

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: connectToDatabaseMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: loggerErrorMock,
  },
}));

vi.mock("next/server", () => {
  class MockNextRequest {
    url: string;
    private body: unknown;
    headers: Headers;
    constructor(url: string | URL, body: unknown) {
      this.url = url.toString();
      this.body = body;
      this.headers = new Headers();
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

describe("POST /api/vendor/apply", () => {
  beforeEach(() => {

    vi.clearAllMocks();
    enforceRateLimitMock.mockReturnValue(null);
    connectToDatabaseMock.mockResolvedValue(undefined);
  });

  it("returns 503 when database connection fails", async () => {
    connectToDatabaseMock.mockRejectedValueOnce(new Error("db down"));

    const { POST } = await import("@/app/api/vendor/apply/route");
    const mod = await import("next/server");
    const req = new (mod.NextRequest as any)("https://example.com/api/vendor/apply", {
      company: "Co",
      contactName: "Jane Doe",
      email: "jane@example.com",
    });

    const res = (await POST(req)) as { status: number; body: any };
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      error: expect.stringMatching(/temporarily unavailable/i),
    });
    expect(loggerErrorMock).toHaveBeenCalled();
  });
});
