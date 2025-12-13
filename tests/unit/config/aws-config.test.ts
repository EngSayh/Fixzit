import { describe, expect, it } from "vitest";
import { validateAwsConfig } from "@/lib/config/constants";

describe("AWS S3 configuration requirements", () => {
  it("throws when required S3 env vars are missing in production", () => {
    const env = {
      NODE_ENV: "production",
    } as NodeJS.ProcessEnv;

    expect(() => validateAwsConfig(env)).toThrow(
      /AWS_REGION|AWS_S3_BUCKET/,
    );
  });

  it("returns when required S3 env vars are provided in production", () => {
    const env = {
      NODE_ENV: "production",
      AWS_S3_BUCKET: "prod-bucket",
      AWS_REGION: "me-south-1",
    } as NodeJS.ProcessEnv;

    expect(() => validateAwsConfig(env)).not.toThrow();
  });
});
