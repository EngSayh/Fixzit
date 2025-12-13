import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("Config auth secret resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("uses AUTH_SECRET when NEXTAUTH_SECRET is missing in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/fixzit";
    process.env.AWS_REGION = "me-south-1";
    process.env.AWS_S3_BUCKET = "fixzit-bucket";
    process.env.AUTH_SECRET = "legacy-auth-secret";
    process.env.SKIP_CONFIG_VALIDATION = "false";
    process.env.SKIP_ENV_VALIDATION = "false";
    process.env.VERCEL = "0";
    process.env.VERCEL_ENV = "production";
    process.env.CI = "false";
    process.env.NEXT_PHASE = "";
    process.env.npm_lifecycle_event = "";
    delete process.env.NEXTAUTH_SECRET;

    const { Config } = await import("@/lib/config/constants");

    expect(Config.auth.secret).toBe("legacy-auth-secret");
    expect(process.env.NEXTAUTH_SECRET).toBe("legacy-auth-secret");
  });

  it("throws when neither NEXTAUTH_SECRET nor AUTH_SECRET is set in production runtime", async () => {
    process.env.NODE_ENV = "production";
    process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/fixzit";
    process.env.AWS_REGION = "me-south-1";
    process.env.AWS_S3_BUCKET = "fixzit-bucket";
    process.env.SKIP_CONFIG_VALIDATION = "false";
    process.env.SKIP_ENV_VALIDATION = "false";
    process.env.VERCEL = "0";
    process.env.VERCEL_ENV = "production";
    process.env.CI = "false";
    process.env.NEXT_PHASE = "";
    process.env.npm_lifecycle_event = "";
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_SECRET;

    await expect(import("@/lib/config/constants")).rejects.toThrow(
      /NEXTAUTH_SECRET \(or AUTH_SECRET\) is not set/,
    );
  });
});
