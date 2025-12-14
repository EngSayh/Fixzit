/**
 * AWS S3 Configuration - Single Source of Truth
 * 
 * Centralizes S3 environment variable access and validation.
 * IMPORTANT: Never throws at import time - only when routes are invoked.
 * 
 * @module lib/storage/s3-config
 */

import { S3Client } from "@aws-sdk/client-s3";
import { logger } from "@/lib/logger";

/**
 * S3 configuration interface
 */
export interface S3Config {
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  kmsKeyId?: string;
}

/**
 * Get S3 configuration from environment variables
 * Returns null if required vars are missing (non-throwing)
 */
export function getS3Config(): S3Config | null {
  const region = process.env.AWS_REGION?.trim();
  const bucket = process.env.AWS_S3_BUCKET?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const kmsKeyId = process.env.AWS_S3_KMS_KEY_ID?.trim();

  // All required vars must be present
  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    kmsKeyId,
  };
}

/**
 * Check if S3 is fully configured
 */
export function isS3Configured(): boolean {
  return getS3Config() !== null;
}

/**
 * Get S3 client instance (returns null if not configured)
 */
export function getS3Client(): S3Client | null {
  const config = getS3Config();
  
  if (!config) {
    return null;
  }

  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId!,
      secretAccessKey: config.secretAccessKey!,
    },
  });
}

/**
 * Assert S3 is configured - throws clear error for route handlers
 * Use this at the start of upload/presign routes
 */
export function assertS3Configured(): S3Config {
  const config = getS3Config();
  
  if (!config) {
    const missing: string[] = [];
    if (!process.env.AWS_REGION) missing.push("AWS_REGION");
    if (!process.env.AWS_S3_BUCKET) missing.push("AWS_S3_BUCKET");
    if (!process.env.AWS_ACCESS_KEY_ID) missing.push("AWS_ACCESS_KEY_ID");
    if (!process.env.AWS_SECRET_ACCESS_KEY) missing.push("AWS_SECRET_ACCESS_KEY");

    logger.warn("[S3] Configuration incomplete", {
      missing,
      metric: "s3.config.missing",
    });

    throw new S3NotConfiguredError(missing);
  }

  return config;
}

/**
 * Custom error for S3 configuration issues
 */
export class S3NotConfiguredError extends Error {
  public readonly missing: string[];
  public readonly statusCode = 501;
  
  constructor(missing: string[]) {
    super("S3_NOT_CONFIGURED");
    this.name = "S3NotConfiguredError";
    this.missing = missing;
  }

  toJSON() {
    return {
      error: "S3_NOT_CONFIGURED",
      message: "S3 file storage is not configured on this server",
      required: ["AWS_REGION", "AWS_S3_BUCKET", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
      missing: this.missing,
    };
  }
}

/**
 * Sanitize filename for S3 key generation
 * Removes unsafe characters and limits length
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Replace unsafe chars
    .replace(/_{2,}/g, "_") // Collapse multiple underscores
    .slice(0, 100); // Max 100 chars
}

/**
 * Build S3 key with consistent format
 * Format: org/{orgId}/{module}/{entityId}/{yyyy}/{mm}/{uuid}-{filename}
 */
export function buildS3Key(params: {
  orgId: string;
  module: string;
  entityId: string;
  filename: string;
  uuid: string;
}): string {
  const { orgId, module, entityId, filename, uuid } = params;
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  
  const sanitized = sanitizeFilename(filename);
  
  return `org/${orgId}/${module}/${entityId}/${yyyy}/${mm}/${uuid}-${sanitized}`;
}
