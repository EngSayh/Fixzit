import { describe, it, expect, vi, beforeEach } from "vitest";

const getSessionUserMock = vi.fn();
const smartRateLimitMock = vi.fn();
const buildOrgAwareRateLimitKeyMock = vi.fn();
const createSecureResponseMock = vi.fn((body: unknown, status = 200) => ({
  body,
  status,
}));

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: smartRateLimitMock,
}));

vi.mock("@/server/security/rateLimitKey", () => ({
  buildOrgAwareRateLimitKey: buildOrgAwareRateLimitKeyMock,
}));

vi.mock("@/server/security/headers", () => ({
  createSecureResponse: createSecureResponseMock,
  getClientIP: () => "127.0.0.1",
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: () => ({ status: 429 }),
}));

vi.mock("@/lib/storage/s3", () => ({
  getPresignedPutUrl: vi.fn(),
}));

vi.mock("@/lib/config/constants", () => ({
  Config: {
    aws: {
      s3: { bucket: "bucket" },
      region: "us-east-1",
      scan: { required: false, endpoint: "av" },
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("next/server", () => {
  class MockNextRequest {
    url: string;
    headers: Headers;
    private body: unknown;
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

describe("POST /api/upload/presigned-url", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    smartRateLimitMock.mockResolvedValue({ allowed: true });
    buildOrgAwareRateLimitKeyMock.mockReturnValue("key");
    getSessionUserMock.mockResolvedValue({
      id: "user1",
      orgId: "org1",
      tenantId: "org1",
    });
  });

  it("returns 503 when auth service throws", async () => {
    getSessionUserMock.mockRejectedValueOnce(new Error("auth down"));

    const { POST } = await import("@/app/api/upload/presigned-url/route");
    const mod = await import("next/server");
    const req = new (mod.NextRequest as any)("https://example.com/api/upload/presigned-url", {
      fileName: "file.pdf",
      fileType: "application/pdf",
      fileSize: 10,
    });

    const res = (await POST(req)) as { status: number; body: any };
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      error: expect.stringMatching(/Auth service unavailable/i),
    });
  });
});
