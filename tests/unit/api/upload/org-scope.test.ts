import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET as verifyMetadataGet } from "@/app/api/upload/verify-metadata/route";
import { POST as scanPost } from "@/app/api/upload/scan/route";
import { makeGetRequest, makePostRequest } from "@/tests/helpers/request";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { smartRateLimit } from "@/server/security/rateLimit";
import { getS3Client } from "@/lib/storage/s3";
import { scanS3Object } from "@/lib/security/av-scan";
import { Config } from "@/lib/config/constants";

vi.mock("@/lib/auth/safe-session", () => ({
  getSessionOrNull: vi.fn(),
}));

vi.mock("@/server/security/rateLimit", () => ({
  smartRateLimit: vi.fn(async () => ({ allowed: true })),
  buildOrgAwareRateLimitKey: vi.fn(() => "rate-limit-key"),
}));

vi.mock("@/server/utils/errorResponses", () => ({
  rateLimitError: vi.fn(() =>
    NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 }),
  ),
}));

vi.mock("@/lib/storage/s3", () => ({
  getS3Client: vi.fn(() => ({
    send: vi.fn().mockResolvedValue({
      ContentType: "application/pdf",
      ContentLength: 123,
      Metadata: { foo: "bar" },
    }),
  })),
}));

vi.mock("@/lib/security/av-scan", () => ({
  scanS3Object: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/security/s3-policy", () => ({
  validateBucketPolicies: vi.fn().mockResolvedValue(true),
}));

describe("Upload org scoping", () => {
  const session = { id: "user-1", orgId: "tenant-1", tenantId: "tenant-1" };
  const tenantKey = "tenant-1/documents/file.pdf";

  beforeEach(() => {
    vi.clearAllMocks();
    (getSessionOrNull as vi.Mock).mockResolvedValue({ ok: true, session });
    (smartRateLimit as vi.Mock).mockResolvedValue({ allowed: true });
    Config.aws.scan.endpoint = "https://scan-endpoint.test";
    Config.aws.s3.bucket = "test-s3-bucket";
  });

  it("blocks verify-metadata GET for cross-tenant keys", async () => {
    const req = makeGetRequest(
      "https://test.com/api/upload/verify-metadata?key=tenant-2/documents/other.pdf",
    );
    const res = await verifyMetadataGet(req as any);
    expect(res.status).toBe(403);
    expect((getS3Client as vi.Mock)).not.toHaveBeenCalled();
  });

  it("allows verify-metadata GET for matching org keys", async () => {
    const res = await verifyMetadataGet(
      makeGetRequest(
        `https://test.com/api/upload/verify-metadata?key=${tenantKey}`,
      ) as any,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.key).toBe(tenantKey);
  });

  it("blocks upload scan for cross-tenant keys", async () => {
    const req = makePostRequest(
      "https://test.com/api/upload/scan",
      { key: "tenant-2/documents/file.pdf" },
    );
    const res = await scanPost(req as any);
    expect(res.status).toBe(403);
    expect((scanS3Object as vi.Mock)).not.toHaveBeenCalled();
  });

  it("allows upload scan for matching org keys", async () => {
    const req = makePostRequest("https://test.com/api/upload/scan", { key: tenantKey });
    const res = await scanPost(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.clean).toBe(true);
  });
});
