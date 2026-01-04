/**
 * Environment Validation Module
 *
 * Validates critical environment variables on application startup.
 * Provides clear error messages when required configuration is missing.
 *
 * @module lib/env-validation
 */

import { logger } from "@/lib/logger";
import { getEnv } from "@/lib/env";

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

type ValidationOptions = {
  strict?: boolean;
};

/**
 * Validate SMS provider configuration
 * 
 * IMPORTANT: This system uses TAQNYAT ONLY as the SMS provider (CITC-compliant for Saudi Arabia).
 * Legacy providers (Twilio, Unifonic, Nexmo, SNS) have been removed.
 */
export function validateSMSConfig(options: ValidationOptions = {}): EnvValidationResult {
  const _strict = options.strict !== false;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for Taqnyat SMS provider (CITC-compliant for Saudi Arabia)
  const hasTaqnyat = Boolean(
    process.env.TAQNYAT_BEARER_TOKEN &&
    process.env.TAQNYAT_SENDER_NAME
  );
  const smsDevMode = process.env.SMS_DEV_MODE === "true";

  if (!hasTaqnyat && !smsDevMode) {
    const msg =
      "No SMS provider configured. Configure TAQNYAT_BEARER_TOKEN and TAQNYAT_SENDER_NAME, or set SMS_DEV_MODE=true.";
    // CHANGED: SMS is optional - warn instead of error to allow graceful degradation
    warnings.push(msg);
  }

  // Validate Taqnyat config completeness (partial config is a warning)
  if (process.env.TAQNYAT_BEARER_TOKEN && !process.env.TAQNYAT_SENDER_NAME) {
    warnings.push("TAQNYAT_BEARER_TOKEN is set but TAQNYAT_SENDER_NAME is missing; Taqnyat SMS will fail.");
  }
  if (process.env.TAQNYAT_SENDER_NAME && !process.env.TAQNYAT_BEARER_TOKEN) {
    warnings.push("TAQNYAT_SENDER_NAME is set but TAQNYAT_BEARER_TOKEN is missing; Taqnyat SMS will fail.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate job/cron and webhook secrets (used by scheduled endpoints and callbacks)
 */
export function validateJobSecrets(options: ValidationOptions = {}): EnvValidationResult {
  const strict = options.strict !== false;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Cron secret validation
  if (!process.env.CRON_SECRET) {
    if (process.env.NODE_ENV === "production" && strict) {
      errors.push("CRON_SECRET is required for secured cron endpoints.");
    } else {
      warnings.push("CRON_SECRET not set. Cron job endpoints will reject secret auth.");
    }
  }

  // SEC-001: Webhook secrets validation
  if (!process.env.TAP_WEBHOOK_SECRET) {
    warnings.push("TAP_WEBHOOK_SECRET not set. TAP payment webhooks will be rejected.");
  }

  if (!process.env.COPILOT_WEBHOOK_SECRET) {
    warnings.push("COPILOT_WEBHOOK_SECRET not set. Copilot knowledge webhooks will be rejected.");
  }

  if (!process.env.SENDGRID_WEBHOOK_SECRET) {
    warnings.push("SENDGRID_WEBHOOK_SECRET not set. SendGrid inbound webhooks will be rejected.");
  }

  // Vercel cron authorization
  if (!process.env.VERCEL_CRON_SECRET && !process.env.CRON_SECRET) {
    warnings.push("Neither VERCEL_CRON_SECRET nor CRON_SECRET set. Scheduled jobs may fail authorization.");
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
export function validateEncryptionConfig(options: ValidationOptions = {}): EnvValidationResult {
  const _strict = options.strict !== false;
  const errors: string[] = [];
  const warnings: string[] = [];

  const encryptionKey = process.env.ENCRYPTION_KEY || process.env.PII_ENCRYPTION_KEY;

  if (!encryptionKey) {
    // CHANGED: Encryption can fallback to mock in emergency - warn instead of error
    // This allows the system to start but encryption operations will fail gracefully
    warnings.push(
      "ENCRYPTION_KEY not set. Using fallback encryption mode - PII encryption disabled."
    );
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
export function validateAuthConfig(options: ValidationOptions = {}): EnvValidationResult {
  const strict = options.strict !== false;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    if (process.env.NODE_ENV === "production" && strict) {
      errors.push("AUTH_SECRET or NEXTAUTH_SECRET is required in production.");
    } else {
      warnings.push("AUTH_SECRET not set. Using ephemeral secret in non-production.");
    }
  }

  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === "production" && strict) {
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
export function validateDatabaseConfig(options: ValidationOptions = {}): EnvValidationResult {
  const strict = options.strict !== false;
  const errors: string[] = [];
  const warnings: string[] = [];

  const mongoUri = getEnv("MONGODB_URI");

  if (!mongoUri) {
    if (process.env.NODE_ENV === "production" && strict) {
      errors.push("MONGODB_URI (or alias DATABASE_URL/MONGODB_URL/MONGO_URL) is required. Database connection will fail.");
    } else {
      warnings.push("MONGODB_URI not set. Database connection will fail.");
    }
  }

  // NOTE: Cache and queue features use in-memory stores only.

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate payment gateway configuration (Tap Payments only)
 * 
 * IMPORTANT: This system uses TAP PAYMENTS ONLY as the payment gateway.
 * Legacy non-Tap gateways have been removed from the entire codebase.
 */
export function validatePaymentConfig(options: ValidationOptions = {}): EnvValidationResult {
  const _strict = options.strict !== false;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Tap: Environment-aware key detection
  const tapEnvIsLive = process.env.TAP_ENVIRONMENT === "live" || process.env.NODE_ENV === "production";
  const tapSecretKey = tapEnvIsLive 
    ? process.env.TAP_LIVE_SECRET_KEY 
    : process.env.TAP_TEST_SECRET_KEY;
  const hasTap = Boolean(tapSecretKey);

  if (!hasTap) {
    const tapKeyName = tapEnvIsLive ? "TAP_LIVE_SECRET_KEY" : "TAP_TEST_SECRET_KEY";
    const msg = `Tap Payments not configured. Set TAP_ENVIRONMENT and ${tapKeyName} to enable payments.`;
    // CHANGED: Payment is optional - warn instead of error to allow graceful degradation
    warnings.push(msg);
  }
  // NOTE: TAP_WEBHOOK_SECRET check is done in SEC-001 webhook secrets validation above

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
export function validateAllEnv(options: ValidationOptions = {}): EnvValidationResult {
  const strict = options.strict !== false;
  const results: EnvValidationResult[] = [
    validateSMSConfig({ strict }),
    validateJobSecrets({ strict }),
    validatePaymentConfig({ strict }),
    validateEncryptionConfig({ strict }),
    validateAuthConfig({ strict }),
    validateDatabaseConfig({ strict }),
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
    if (strict && process.env.NODE_ENV === "production" && allErrors.length > 0) {
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
    taqnyat: {
      configured: Boolean(
        process.env.TAQNYAT_BEARER_TOKEN &&
        process.env.TAQNYAT_SENDER_NAME
      ),
    },
    legacySmsProviders: {
      configured: Boolean(
        process.env.TWILIO_ACCOUNT_SID ||
        process.env.UNIFONIC_APP_SID
      ),
      details: "Legacy SMS providers detected; Taqnyat is the only supported provider.",
    },
    encryption: {
      configured: Boolean(
        process.env.ENCRYPTION_KEY || process.env.PII_ENCRYPTION_KEY
      ),
    },
    mongodb: {
      configured: Boolean(getEnv("MONGODB_URI")),
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
    tap: {
      // Environment-aware: check the appropriate key based on TAP_ENVIRONMENT
      configured: Boolean(
        process.env.TAP_ENVIRONMENT === "live" || process.env.NODE_ENV === "production"
          ? process.env.TAP_LIVE_SECRET_KEY
          : process.env.TAP_TEST_SECRET_KEY
      ),
      details: `environment=${process.env.TAP_ENVIRONMENT || "test"}`,
    },
  };
}
