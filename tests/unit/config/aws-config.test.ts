import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

describe("AWS S3 configuration requirements", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("throws when required S3 env vars are missing in production", async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
    };
    delete process.env.AWS_S3_BUCKET;
    delete process.env.AWS_REGION;

    vi.resetModules();
    // AWS_REGION is checked first, so expect that in the error
    await expect(
      import("@/lib/config/constants"),
    ).rejects.toThrow(/AWS_REGION|AWS_S3_BUCKET/);
  });

  it("returns provided S3 env vars when set", async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      AWS_S3_BUCKET: "prod-bucket",
      AWS_REGION: "me-south-1",
    };

    vi.resetModules();
    const { Config } = await import("@/lib/config/constants");
    expect(Config.aws.s3.bucket).toBe("prod-bucket");
    expect(Config.aws.region).toBe("me-south-1");
  });
});
