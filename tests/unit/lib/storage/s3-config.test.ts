/**
 * S3 Configuration Tests
 * Tests S3 config module for proper error handling when env vars are missing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getS3Config,
  isS3Configured,
  getS3Client,
  assertS3Configured,
  S3NotConfiguredError,
  sanitizeFilename,
  buildS3Key,
} from "@/lib/storage/s3-config";

describe("S3 Configuration Module", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getS3Config", () => {
    it("returns null when AWS_REGION is missing", () => {
      delete process.env.AWS_REGION;
      process.env.AWS_S3_BUCKET = "test-bucket";
      process.env.AWS_ACCESS_KEY_ID = "test-key";
      process.env.AWS_SECRET_ACCESS_KEY = "test-secret";

      expect(getS3Config()).toBeNull();
    });

    it("returns null when AWS_S3_BUCKET is missing", () => {
      process.env.AWS_REGION = "us-east-1";
      delete process.env.AWS_S3_BUCKET;
      process.env.AWS_ACCESS_KEY_ID = "test-key";
      process.env.AWS_SECRET_ACCESS_KEY = "test-secret";

      expect(getS3Config()).toBeNull();
    });

    it("returns null when AWS_ACCESS_KEY_ID is missing", () => {
      process.env.AWS_REGION = "us-east-1";
      process.env.AWS_S3_BUCKET = "test-bucket";
      delete process.env.AWS_ACCESS_KEY_ID;
      process.env.AWS_SECRET_ACCESS_KEY = "test-secret";

      expect(getS3Config()).toBeNull();
    });

    it("returns null when AWS_SECRET_ACCESS_KEY is missing", () => {
      process.env.AWS_REGION = "us-east-1";
      process.env.AWS_S3_BUCKET = "test-bucket";
      process.env.AWS_ACCESS_KEY_ID = "test-key";
      delete process.env.AWS_SECRET_ACCESS_KEY;

      expect(getS3Config()).toBeNull();
    });

    it("returns config object when all required vars are present", () => {
      process.env.AWS_REGION = "us-east-1";
      process.env.AWS_S3_BUCKET = "test-bucket";
      process.env.AWS_ACCESS_KEY_ID = "test-key";
      process.env.AWS_SECRET_ACCESS_KEY = "test-secret";
      process.env.AWS_S3_KMS_KEY_ID = "test-kms-key";

      const config = getS3Config();
      
      expect(config).toEqual({
        region: "us-east-1",
        bucket: "test-bucket",
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
        kmsKeyId: "test-kms-key",
      });
    });
  });

  describe("isS3Configured", () => {
    it("returns false when config is missing", () => {
      delete process.env.AWS_REGION;
      
      expect(isS3Configured()).toBe(false);
    });

    it("returns true when config is complete", () => {
      process.env.AWS_REGION = "us-east-1";
      process.env.AWS_S3_BUCKET = "test-bucket";
      process.env.AWS_ACCESS_KEY_ID = "test-key";
      process.env.AWS_SECRET_ACCESS_KEY = "test-secret";

      expect(isS3Configured()).toBe(true);
    });
  });

  describe("getS3Client", () => {
    it("returns null when config is incomplete", () => {
      delete process.env.AWS_REGION;
      
      expect(getS3Client()).toBeNull();
    });

    it("returns S3Client instance when config is complete", () => {
      process.env.AWS_REGION = "us-east-1";
      process.env.AWS_S3_BUCKET = "test-bucket";
      process.env.AWS_ACCESS_KEY_ID = "test-key";
      process.env.AWS_SECRET_ACCESS_KEY = "test-secret";

      const client = getS3Client();
      
      expect(client).not.toBeNull();
      expect(client).toBeDefined();
    });
  });

  describe("assertS3Configured", () => {
    it("throws S3NotConfiguredError when config is incomplete", () => {
      delete process.env.AWS_REGION;
      process.env.AWS_S3_BUCKET = "test-bucket";

      expect(() => assertS3Configured()).toThrow(S3NotConfiguredError);
    });

    it("throws with correct missing variables list", () => {
      delete process.env.AWS_REGION;
      delete process.env.AWS_ACCESS_KEY_ID;

      try {
        assertS3Configured();
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(S3NotConfiguredError);
        expect((error as S3NotConfiguredError).missing).toContain("AWS_REGION");
        expect((error as S3NotConfiguredError).missing).toContain("AWS_ACCESS_KEY_ID");
      }
    });

    it("returns config when all vars are present", () => {
      process.env.AWS_REGION = "us-east-1";
      process.env.AWS_S3_BUCKET = "test-bucket";
      process.env.AWS_ACCESS_KEY_ID = "test-key";
      process.env.AWS_SECRET_ACCESS_KEY = "test-secret";

      const config = assertS3Configured();
      
      expect(config).toBeDefined();
      expect(config.region).toBe("us-east-1");
      expect(config.bucket).toBe("test-bucket");
    });
  });

  describe("S3NotConfiguredError", () => {
    it("has correct statusCode property (503 Service Unavailable)", () => {
      const error = new S3NotConfiguredError(["AWS_REGION"]);
      
      expect(error.statusCode).toBe(503);
    });

    it("serializes to JSON with correct format", () => {
      const error = new S3NotConfiguredError(["AWS_REGION", "AWS_S3_BUCKET"]);
      const json = error.toJSON();
      
      expect(json).toEqual({
        error: "S3_NOT_CONFIGURED",
        message: "File storage service is temporarily unavailable. Please contact support.",
        code: "SERVICE_UNAVAILABLE",
        retryable: true,
      });
    });
  });

  describe("sanitizeFilename", () => {
    it("removes unsafe characters", () => {
      expect(sanitizeFilename("file<>name.pdf")).toBe("file_name.pdf"); // <> both replaced, then collapsed
      expect(sanitizeFilename("file|name*.pdf")).toBe("file_name_.pdf");
    });

    it("collapses multiple underscores", () => {
      expect(sanitizeFilename("file___name.pdf")).toBe("file_name.pdf");
    });

    it("limits filename to 100 characters", () => {
      const longName = "a".repeat(150) + ".pdf";
      const sanitized = sanitizeFilename(longName);
      
      expect(sanitized.length).toBe(100);
    });

    it("preserves allowed characters", () => {
      expect(sanitizeFilename("file-name_123.test.pdf")).toBe("file-name_123.test.pdf");
    });
  });

  describe("buildS3Key", () => {
    it("generates key with correct format", () => {
      const key = buildS3Key({
        orgId: "org123",
        module: "work-orders",
        entityId: "wo456",
        filename: "attachment.pdf",
        uuid: "test-uuid",
      });

      expect(key).toMatch(/^org\/org123\/work-orders\/wo456\/\d{4}\/\d{2}\/test-uuid-attachment\.pdf$/);
    });

    it("sanitizes filename in key", () => {
      const key = buildS3Key({
        orgId: "org123",
        module: "work-orders",
        entityId: "wo456",
        filename: "file<>name.pdf",
        uuid: "test-uuid",
      });

      expect(key).toContain("file_name.pdf"); // <> collapsed to single _
      expect(key).not.toContain("<");
      expect(key).not.toContain(">");
    });

    it("uses current date for path segments", () => {
      const now = new Date();
      const yyyy = now.getUTCFullYear();
      const mm = String(now.getUTCMonth() + 1).padStart(2, "0");

      const key = buildS3Key({
        orgId: "org123",
        module: "resumes",
        entityId: "user789",
        filename: "resume.pdf",
        uuid: "uuid",
      });

      expect(key).toContain(`/${yyyy}/${mm}/`);
    });
  });
});
