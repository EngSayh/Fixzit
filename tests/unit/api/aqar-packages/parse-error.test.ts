import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


const enforceRateLimitMock = vi.fn();
const connectDbMock = vi.fn();
const getSessionUserMock = vi.fn();

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

vi.mock("@/lib/mongo", () => ({
  connectDb: connectDbMock,
}));

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/server/models/aqar", () => ({
  AqarPackage: {
    find: vi.fn(),
    getPricing: vi.fn().mockReturnValue({ price: 1, listings: 1, days: 1 }),
  },
  AqarPayment: vi.fn(),
  PackageType: {
    STARTER: "STARTER",
    STANDARD: "STANDARD",
    PREMIUM: "PREMIUM",
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock("@/lib/i18n/server", () => ({
  getServerTranslation: async () => (key: string) => key,
}));

vi.mock("next/server", () => {
  class MockNextRequest {
    url: string;
    headers: Headers;
    constructor(url: string | URL) {
      this.url = url.toString();
      this.headers = new Headers();
    }
    async json() {
      throw new Error("invalid json");
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

describe("POST /api/aqar/packages", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    enforceRateLimitMock.mockReturnValue(null);
    connectDbMock.mockResolvedValue(undefined);
    getSessionUserMock.mockResolvedValue({ id: "user1", orgId: "org1" });
  });

  it("returns 400 on malformed JSON", async () => {
    const { POST } = await import("@/app/api/aqar/packages/route");
    const mod = await import("next/server");
    const req = new (mod.NextRequest as any)("https://example.com/api/aqar/packages");

    const res = (await POST(req)) as { status: number; body: any };
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: expect.objectContaining({
        userMessage: expect.stringMatching(/Invalid JSON/i),
      }),
    });
  });
});
