import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn().mockRejectedValue(new Error("no session")),
}));

vi.mock("next/server", () => {
  class MockNextRequest {
    url: string;
    headers: Headers;
    constructor(url: string | URL, headers?: HeadersInit) {
      const u = new URL(url.toString());
      this.url = u.toString();
      this.headers = new Headers(headers);
    }
    async json() {
      return { name: "Test", type: "PLANNING" };
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

describe("projects test-only route", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns 404 when not in test context", async () => {
    process.env.PLAYWRIGHT_TESTS = "";
    process.env.NODE_ENV = "production";

    const { GET } = await import("@/app/api/projects/route");
    const mod = await import("next/server");
    const req = new (mod.NextRequest as any)("https://example.com/api/projects");
    const res = (await GET(req)) as { status: number };
    expect(res.status).toBe(404);
  });

  it("allows access when PLAYWRIGHT_TESTS=true with x-user header", async () => {
    process.env.PLAYWRIGHT_TESTS = "true";
    process.env.NODE_ENV = "test";

    const { POST } = await import("@/app/api/projects/route");
    const mod = await import("next/server");
    const headers = new Headers({
      "x-user": JSON.stringify({ id: "u1", orgId: "org1", tenantId: "t1" }),
    });
    const req = new (mod.NextRequest as any)("https://example.com/api/projects", {
      headers,
    });
    const res = (await POST(req)) as { status: number; body: any };
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      tenantId: "t1",
      createdBy: "u1",
    });
  });
});
