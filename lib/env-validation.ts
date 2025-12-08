/**
 * Environment Validation Module
 *
 * Validates critical environment variables on application startup.
 * Provides clear error messages when required configuration is missing.
 *
 * @module lib/env-validation
 */

import { logger } from "@/lib/logger";

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate SMS provider configuration
 */
export function validateSMSConfig(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for at least one SMS provider
  const hasTwilio = Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
  const hasUnifonic = Boolean(process.env.UNIFONIC_APP_SID);

  if (!hasTwilio && !hasUnifonic) {
    warnings.push(
      "No SMS provider configured. Set TWILIO_* or UNIFONIC_* env vars. SMS will be disabled."
    );
  }

  if (hasTwilio) {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      errors.push("TWILIO_ACCOUNT_SID is missing");
    }
    if (!process.env.TWILIO_AUTH_TOKEN) {
      errors.push("TWILIO_AUTH_TOKEN is missing");
    }
    if (!process.env.TWILIO_PHONE_NUMBER) {
      errors.push("TWILIO_PHONE_NUMBER is missing");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate encryption configuration
 */
export function validateEncryptionConfig(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const encryptionKey = process.env.ENCRYPTION_KEY || process.env.PII_ENCRYPTION_KEY;

  if (!encryptionKey) {
    if (process.env.NODE_ENV === "production") {
      errors.push(
        "ENCRYPTION_KEY is required in production. PII data cannot be encrypted without it."
      );
    } else {
      warnings.push(
        "ENCRYPTION_KEY not set. Using mock encryption in non-production."
      );
    }
  } else if (encryptionKey.length < 32) {
    warnings.push(
      "ENCRYPTION_KEY should be at least 32 characters for AES-256 security."
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate authentication configuration
 */
export function validateAuthConfig(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    if (process.env.NODE_ENV === "production") {
      errors.push("AUTH_SECRET or NEXTAUTH_SECRET is required in production.");
    } else {
      warnings.push("AUTH_SECRET not set. Using ephemeral secret in non-production.");
    }
  }

  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === "production") {
      errors.push("JWT_SECRET is required in production.");
    } else {
      warnings.push("JWT_SECRET not set. Using ephemeral secret in non-production.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate database configuration
 */
export function validateDatabaseConfig(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.MONGODB_URI) {
    errors.push("MONGODB_URI is required. Database connection will fail.");
  }

  if (!process.env.REDIS_URL && !process.env.UPSTASH_REDIS_REST_URL) {
    warnings.push(
      "No Redis configuration found. BullMQ queues and caching will be disabled."
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all critical environment variables
 * Call this on application startup
 */
export function validateAllEnv(): EnvValidationResult {
  const results: EnvValidationResult[] = [
    validateSMSConfig(),
    validateEncryptionConfig(),
    validateAuthConfig(),
    validateDatabaseConfig(),
  ];

  const allErrors = results.flatMap((r) => r.errors);
  const allWarnings = results.flatMap((r) => r.warnings);

  // Log warnings
  for (const warning of allWarnings) {
    logger.warn(`[Env Validation] ${warning}`);
  }

  // Log errors
  for (const error of allErrors) {
    logger.error(`[Env Validation] ${error}`);
  }

  const result = {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };

  if (result.valid) {
    logger.info("[Env Validation] All critical environment variables validated", {
      warnings: allWarnings.length,
    });
  } else {
    logger.error("[Env Validation] Critical environment variables missing", {
      errors: allErrors.length,
      warnings: allWarnings.length,
    });

    // In production, throw to prevent startup with invalid config
    if (process.env.NODE_ENV === "production" && allErrors.length > 0) {
      throw new Error(
        `Environment validation failed: ${allErrors.join("; ")}`
      );
    }
  }

  return result;
}

/**
 * Get configuration status for health check
 */
export function getConfigStatus(): Record<string, { configured: boolean; details?: string }> {
  return {
    twilio: {
      configured: Boolean(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER
      ),
    },
    unifonic: {
      configured: Boolean(process.env.UNIFONIC_APP_SID),
    },
    encryption: {
      configured: Boolean(
        process.env.ENCRYPTION_KEY || process.env.PII_ENCRYPTION_KEY
      ),
    },
    mongodb: {
      configured: Boolean(process.env.MONGODB_URI),
    },
    redis: {
      configured: Boolean(
        process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
      ),
    },
    sendgrid: {
      configured: Boolean(process.env.SENDGRID_API_KEY),
    },
    s3: {
      configured: Boolean(
        process.env.AWS_S3_BUCKET &&
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY
      ),
    },
  };
}
