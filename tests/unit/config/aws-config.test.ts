import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/logger";

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock IS_BROWSER to false so validation runs
vi.mock("@/lib/utils/env", () => ({
  IS_BROWSER: false,
  isTruthy: vi.fn(),
}));

describe("AWS S3 configuration requirements", () => {
  const originalEnv = { ...process.env };
  
  beforeEach(async () => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("warns when required S3 env vars are missing in production", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.AWS_REGION;
    delete process.env.AWS_S3_BUCKET;
    
    // Import after mocks are set up
    const { validateAwsConfig } = await import("@/lib/config/constants");
    
    const env = {
      NODE_ENV: "production",
    } as NodeJS.ProcessEnv;

    validateAwsConfig(env);
    
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("AWS"),
      expect.any(Object)
    );
  });

  it("returns when required S3 env vars are provided in production", async () => {
    // Import after mocks are set up
    const { validateAwsConfig } = await import("@/lib/config/constants");
    
    const env = {
      NODE_ENV: "production",
      AWS_S3_BUCKET: "prod-bucket",
      AWS_REGION: "me-south-1",
    } as NodeJS.ProcessEnv;

    expect(() => validateAwsConfig(env)).not.toThrow();
  });
});
