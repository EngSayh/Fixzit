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

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
  const unifonicAppSid = process.env.UNIFONIC_APP_SID;
  const unifonicSenderId = process.env.UNIFONIC_SENDER_ID;
  const awsSnsAccessKey = process.env.AWS_SNS_ACCESS_KEY;
  const awsSnsSecret = process.env.AWS_SNS_SECRET;
  const awsSnsRegion = process.env.AWS_SNS_REGION;
  const nexmoApiKey = process.env.NEXMO_API_KEY;
  const nexmoApiSecret = process.env.NEXMO_API_SECRET;

  const hasTwilio = Boolean(twilioSid && twilioToken && twilioNumber);
  const hasUnifonic = Boolean(unifonicAppSid && unifonicSenderId);
  const hasAwsSns = Boolean(awsSnsAccessKey && awsSnsSecret && awsSnsRegion);
  const hasNexmo = Boolean(nexmoApiKey && nexmoApiSecret);
  const smsDevMode = process.env.SMS_DEV_MODE === "true";

  if (smsDevMode) {
    return { valid: true, errors, warnings };
  }

  if (!hasTwilio && (twilioSid || twilioToken || twilioNumber)) {
    if (!twilioSid) errors.push("TWILIO_ACCOUNT_SID is missing");
    if (!twilioToken) errors.push("TWILIO_AUTH_TOKEN is missing");
    if (!twilioNumber) errors.push("TWILIO_PHONE_NUMBER is missing");
  }

  if (!hasUnifonic && (unifonicAppSid || unifonicSenderId)) {
    if (!unifonicAppSid) warnings.push("UNIFONIC_APP_SID is missing");
    if (!unifonicSenderId) warnings.push("UNIFONIC_SENDER_ID is missing");
    errors.push("Unifonic is partially configured; both UNIFONIC_APP_SID and UNIFONIC_SENDER_ID are required.");
  }

  if (hasAwsSns) {
    if (!awsSnsAccessKey) warnings.push("AWS_SNS_ACCESS_KEY is missing; AWS SNS SMS will fail.");
    if (!awsSnsSecret) warnings.push("AWS_SNS_SECRET is missing; AWS SNS SMS will fail.");
    if (!awsSnsRegion) warnings.push("AWS_SNS_REGION is missing; AWS SNS SMS will fail.");
  } else if (awsSnsAccessKey || awsSnsSecret || awsSnsRegion) {
    warnings.push("Partial AWS SNS config detected; provide ACCESS_KEY, SECRET, REGION to enable.");
  }

  if (hasNexmo) {
    if (!nexmoApiKey) warnings.push("NEXMO_API_KEY is missing; Nexmo SMS will fail.");
    if (!nexmoApiSecret) warnings.push("NEXMO_API_SECRET is missing; Nexmo SMS will fail.");
  } else if (nexmoApiKey || nexmoApiSecret) {
    warnings.push("Partial Nexmo config detected; provide API_KEY and API_SECRET to enable.");
  }

  if (!hasTwilio && !hasUnifonic && !hasAwsSns && !hasNexmo && errors.length === 0) {
    errors.push(
      "No SMS provider configured. Configure TWILIO_* (ACCOUNT_SID, AUTH_TOKEN, PHONE_NUMBER), UNIFONIC_* (APP_SID, SENDER_ID), AWS_SNS_* (ACCESS_KEY, SECRET, REGION), or NEXMO_* (API_KEY, API_SECRET), or set SMS_DEV_MODE=true."
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate job/cron secrets (used by scheduled endpoints)
 */
export function validateJobSecrets(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.CRON_SECRET) {
    if (process.env.NODE_ENV === "production") {
      errors.push("CRON_SECRET is required for secured cron endpoints.");
    } else {
      warnings.push("CRON_SECRET not set. Cron job endpoints will reject secret auth.");
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
 * Validate payment gateway configuration (PayTabs, Tap)
 */
export function validatePaymentConfig(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const hasPaytabs =
    Boolean(process.env.PAYTABS_SERVER_KEY) &&
    Boolean(process.env.PAYTABS_PROFILE_ID);
  const hasTap = Boolean(process.env.TAP_WEBHOOK_SECRET);

  if (!hasPaytabs) {
    const msg =
      "PayTabs credentials missing (PAYTABS_SERVER_KEY, PAYTABS_PROFILE_ID)";
    if (process.env.NODE_ENV === "production") {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  }

  if (!hasTap) {
    const msg = "Tap webhook secret missing (TAP_WEBHOOK_SECRET)";
    if (process.env.NODE_ENV === "production") {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
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
    validateJobSecrets(),
    validatePaymentConfig(),
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
  const hasUnifonicApp = Boolean(process.env.UNIFONIC_APP_SID);
  const hasUnifonicSender = Boolean(process.env.UNIFONIC_SENDER_ID);
  return {
    twilio: {
      configured: Boolean(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER
      ),
    },
    unifonic: {
      configured: hasUnifonicApp && hasUnifonicSender,
      details: !hasUnifonicApp && hasUnifonicSender
        ? "UNIFONIC_APP_SID missing"
        : hasUnifonicApp && !hasUnifonicSender
          ? "UNIFONIC_SENDER_ID missing"
          : undefined,
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
    cronSecret: {
      configured: Boolean(process.env.CRON_SECRET),
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
    paytabs: {
      configured: Boolean(
        process.env.PAYTABS_SERVER_KEY && process.env.PAYTABS_PROFILE_ID
      ),
    },
    tap: {
      configured: Boolean(process.env.TAP_WEBHOOK_SECRET),
    },
  };
}
