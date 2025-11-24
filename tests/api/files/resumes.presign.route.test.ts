import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import type { NextRequest } from "next/server";

process.env.SKIP_ENV_VALIDATION = "true";

vi.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: any, init?: ResponseInit) => ({
      status: init?.status ?? 200,
      body,
    }),
  },
}));

const getSessionUser = vi.fn();
const getPresignedPutUrl = vi.fn();
const validateBucketPolicies = vi.fn();

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: () => getSessionUser(),
}));

vi.mock("@/lib/storage/s3", () => ({
  getPresignedPutUrl: (...args: any[]) => getPresignedPutUrl(...args),
  buildResumeKey: (tenant: string, fileName: string) =>
    `${tenant}/resumes/${fileName}`,
}));

vi.mock("@/server/security/rateLimit", () => ({
  rateLimit: vi.fn().mockReturnValue({ allowed: true }),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() => ({
    status: 429,
    body: { error: "rate_limited" },
  })),
}));

vi.mock("@/lib/security/s3-policy", () => ({
  validateBucketPolicies: (...args: any[]) => validateBucketPolicies(...args),
}));

let POST: (req: NextRequest) => Promise<any>;

describe("POST /api/files/resumes/presign", () => {
  beforeAll(async () => {
    ({ POST } = await import("@/app/api/files/resumes/presign/route"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AWS_S3_BUCKET = "test-bucket";
    process.env.AWS_REGION = "us-east-1";
    process.env.S3_SCAN_REQUIRED = "false";
    getSessionUser.mockResolvedValue(null);
    getPresignedPutUrl.mockResolvedValue({
      url: "https://s3.test/upload",
      headers: { "x-test": "1" },
    });
    validateBucketPolicies.mockResolvedValue(true);
  });

  const buildRequest = (body: Record<string, unknown>): NextRequest =>
    ({
      url: "https://example.com/api/files/resumes/presign",
      json: async () => body,
    }) as unknown as NextRequest;

  it("returns presign details for valid PDF input (anonymous allowed)", async () => {
    const res: any = await POST(
      buildRequest({
        fileName: "resume.pdf",
        contentType: "application/pdf",
        size: 1024,
      }),
    );

    expect(res.status).toBe(200);
    expect(res.body.url).toBe("https://s3.test/upload");
    expect(res.body.headers["x-test"]).toBe("1");
    expect(res.body.key).toMatch(/public\/resumes\/.*resume\.pdf$/);
  });

  it("rejects unsupported extension", async () => {
    const res: any = await POST(
      buildRequest({
        fileName: "resume.exe",
        contentType: "application/pdf",
        size: 1024,
      }),
    );

    expect(res.status).toBe(415);
    expect(res.body.error).toMatch(/extension/i);
  });

  it("rejects files over 5MB", async () => {
    const res: any = await POST(
      buildRequest({
        fileName: "resume.pdf",
        contentType: "application/pdf",
        size: 6 * 1024 * 1024,
      }),
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/too large/i);
  });
});
