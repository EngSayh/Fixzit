import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock logger before importing the module that uses it
vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("AWS S3 configuration requirements", () => {
  const originalEnv = { ...process.env };
  
  beforeEach(async () => {
    vi.clearAllMocks();
    // Clear module cache to get fresh imports
    vi.resetModules();
  });
  
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("warns when required S3 env vars are missing in production", async () => {
    // Import logger to check calls
    const { logger } = await import("@/lib/logger");
    
    // Set up production environment WITHOUT AWS vars
    const env = {
      NODE_ENV: "production",
      // AWS_REGION and AWS_S3_BUCKET intentionally missing
    } as NodeJS.ProcessEnv;
    
    // Import fresh after environment is set
    const { validateAwsConfig } = await import("@/lib/config/constants");
    
    validateAwsConfig(env);
    
    // Should warn twice: once for region, once for bucket
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("region"),
      expect.any(Object)
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("bucket"),
      expect.any(Object)
    );
  });

  it("does not warn when required S3 env vars are provided in production", async () => {
    const { logger } = await import("@/lib/logger");
    
    const env = {
      NODE_ENV: "production",
      AWS_S3_BUCKET: "prod-bucket",
      AWS_REGION: "me-south-1",
    } as NodeJS.ProcessEnv;
    
    // Import fresh
    const { validateAwsConfig } = await import("@/lib/config/constants");

    validateAwsConfig(env);
    
    // Should NOT warn when vars are present
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("skips validation in non-production environments", async () => {
    const { logger } = await import("@/lib/logger");
    
    const env = {
      NODE_ENV: "development",
      // No AWS vars
    } as NodeJS.ProcessEnv;
    
    const { validateAwsConfig } = await import("@/lib/config/constants");

    validateAwsConfig(env);
    
    // Should not warn in development (has fallbacks)
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
