import { describe, it, expect, vi, beforeEach } from "vitest";

const requireFmPermissionMock = vi.fn();
const resolveTenantIdMock = vi.fn();
const getDatabaseMock = vi.fn();
const enforceRateLimitMock = vi.fn();
const generateReportMock = vi.fn();
const putObjectBufferMock = vi.fn();
const scanS3ObjectMock = vi.fn();
const loggerErrorMock = vi.fn();

vi.mock("@/app/api/fm/permissions", () => ({
  requireFmPermission: requireFmPermissionMock,
}));

vi.mock("@/app/api/fm/utils/tenant", () => ({
  resolveTenantId: resolveTenantIdMock,
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

vi.mock("@/lib/mongodb-unified", () => ({
  getDatabase: getDatabaseMock,
}));

vi.mock("@/lib/reports/generator", () => ({
  generateReport: generateReportMock,
}));

vi.mock("@/lib/storage/s3", () => ({
  putObjectBuffer: putObjectBufferMock,
  getPresignedGetUrl: vi.fn().mockResolvedValue("url"),
}));

vi.mock("@/lib/security/av-scan", () => ({
  scanS3Object: scanS3ObjectMock,
}));

vi.mock("@/lib/security/s3-policy", () => ({
  validateBucketPolicies: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: loggerErrorMock,
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/app/api/fm/errors", () => ({
  FMErrors: {
    internalError: () => ({ status: 500 }),
  },
}));

vi.mock("next/server", () => {
  class MockNextRequest {
    url: string;
    headers: Headers;
    constructor(url: string | URL) {
      this.url = url.toString();
      this.headers = new Headers();
    }
  }
  class MockNextResponse {
    status: number;
    body: unknown;
    constructor(body: unknown, init?: ResponseInit) {
      this.body = body;
      this.status = init?.status ?? 200;
    }
    static json(body: unknown, init?: ResponseInit) {
      return new MockNextResponse(body, init);
    }
  }
  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

describe("POST /api/fm/reports/process - AV scan handling", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
    enforceRateLimitMock.mockReturnValue(null);
    requireFmPermissionMock.mockResolvedValue({
      isSuperAdmin: false,
      orgId: "org1",
      tenantId: "org1",
      id: "user1",
    });
    resolveTenantIdMock.mockReturnValue({ tenantId: "org1" });
    generateReportMock.mockResolvedValue({
      buffer: Buffer.from("data"),
      mime: "text/csv",
      size: 4,
    });
    putObjectBufferMock.mockResolvedValue(undefined);
    scanS3ObjectMock.mockRejectedValue(new Error("av down"));

    const collection = {
      findOneAndUpdate: vi
        .fn()
        .mockResolvedValueOnce({
          value: {
            _id: "1",
            orgId: "org1",
            name: "job1",
            type: "report",
            format: "csv",
            status: "queued",
          },
        })
        .mockResolvedValue(null),
      updateOne: vi.fn().mockResolvedValue({}),
      find: vi.fn(() => ({
        sort: () => ({
          limit: () => ({
            toArray: async () => [],
          }),
        }),
      })),
    };
    getDatabaseMock.mockResolvedValue({
      collection: () => collection,
    });
  });

  it("returns 503 when AV scanner is unavailable", async () => {
    const { POST } = await import("@/app/api/fm/reports/process/route");
    const mod = await import("next/server");
    const req = new (mod.NextRequest as any)("https://example.com/api/fm/reports/process");

    const res = (await POST(req)) as { status: number; body: any };
    const errorMessages = loggerErrorMock.mock.calls.map((call) => call[0]);
    expect(errorMessages).toContain("FM Reports worker AV scan unavailable");
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      success: false,
      error: "AV scanning unavailable",
    });
    expect(scanS3ObjectMock).toHaveBeenCalled();
    expect(loggerErrorMock).toHaveBeenCalled();
  });
});
