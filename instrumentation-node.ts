/**
 * Node.js-specific Instrumentation
 *
 * This file contains Node.js-specific initialization code that requires
 * Node.js-only modules (bullmq, etc.) and should NOT be bundled
 * for Edge runtime or client-side.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * @module instrumentation-node
 */

import { logger } from "@/lib/logger";

export async function registerNode(): Promise<void> {
  logger.info("[Instrumentation] Starting Node.js server initialization...");

  const isPlaywright =
    process.env.PLAYWRIGHT_TESTS === "true" ||
    process.env.NEXT_PUBLIC_E2E === "true" ||
    process.env.PW_WEB_SERVER !== undefined;
  const strictValidation =
    process.env.NODE_ENV === "production" &&
    process.env.SKIP_ENV_VALIDATION !== "true" &&
    !isPlaywright;

  try {
    // Run production environment safety guards (blocks OTP bypass, localhost MongoDB in prod)
    try {
      const { validateProductionEnv } = await import("@/lib/config/env-guards");
      const guardResult = validateProductionEnv({ throwOnError: false });
      
      // 🔒 SECURITY: Only BLOCK in true production, WARN in preview
      // Rationale: Preview deployments may not have all secrets configured yet
      const isTrueProduction = guardResult.environment === 'production';
      const isPreview = guardResult.environment === 'preview';
      
      // 🔍 DIAGNOSTIC: Safe diagnostic data (no secrets, only presence booleans + error codes)
      const safeDiag = {
        env: guardResult.environment,
        errorCodes: (guardResult.errors || []).map((e) => e.code),
        hasMongo: Boolean(process.env.MONGODB_URI),
        hasAuthSecret: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
        hasJwt: Boolean(process.env.JWT_SECRET),
        mongoPrefixCheck: process.env.MONGODB_URI?.substring(0, 20) || 'MISSING',
        otpBypassFlags: {
          NEXTAUTH_BYPASS_OTP_CODE: Boolean(process.env.NEXTAUTH_BYPASS_OTP_CODE),
          NEXTAUTH_BYPASS_OTP_ALL: Boolean(process.env.NEXTAUTH_BYPASS_OTP_ALL),
          ALLOW_TEST_USER_OTP_BYPASS: Boolean(process.env.ALLOW_TEST_USER_OTP_BYPASS),
        },
      };
      
      // ✅ Always print diagnostic to console so Vercel Logs shows it
      if (!guardResult.passed && (isTrueProduction || isPreview)) {
        // eslint-disable-next-line no-console
        console.error("[Instrumentation] Env guard diagnostic:", JSON.stringify(safeDiag, null, 2));
      }
      
      if (!guardResult.passed && isTrueProduction) {
        logger.error("[Instrumentation] CRITICAL: Production environment safety guards failed", {
          errors: guardResult.errors,
          environment: guardResult.environment,
          diagnostic: safeDiag,
        });
        // 🔒 SECURITY: Re-enabled blocking after confirming env-guards.ts logic is correct
        // OTP bypass variables must NOT exist in production (even if set to "false")
        throw new Error(
          `Production environment safety guards failed. codes=${safeDiag.errorCodes.join(",") || "unknown"}`
        );
      }
      
      if (!guardResult.passed && isPreview) {
        logger.warn("[Instrumentation] Preview environment safety warnings", {
          errors: guardResult.errors,
          environment: guardResult.environment,
          diagnostic: safeDiag,
          message: "These would block production deployment",
        });
        // Log but don't block preview
      }
      
      if (guardResult.warnings.length > 0) {
        logger.warn("[Instrumentation] Environment warnings", {
          warnings: guardResult.warnings,
        });
      }
    } catch (guardError) {
      logger.error("[Instrumentation] Env guard check failed", {
        error: guardError instanceof Error ? guardError.message : String(guardError),
      });
      // 🔒 SECURITY: Re-throw in production to block startup with invalid env config
      const isTrueProduction = 
        process.env.NODE_ENV === "production" && 
        process.env.VERCEL_ENV === "production";
      
      if (isTrueProduction) {
        throw guardError;
      }
    }

    // Validate environment variables
    const { validateAllEnv } = await import("@/lib/env-validation");
    const envResult = validateAllEnv({ strict: strictValidation });

    if (!envResult.valid && strictValidation) {
      logger.error("[Instrumentation] Environment validation failed", {
        errors: envResult.errors,
      });
      logger.error("[Instrumentation] Blocking startup due to invalid environment configuration");
      throw new Error("Environment validation failed; see logs for details");
    } else if (!envResult.valid) {
      logger.warn("[Instrumentation] Environment validation warnings", {
        errors: envResult.errors,
      });
    }

    // Initialize SMS worker if Redis is configured
    // NOTE: Redis has been intentionally removed from the codebase.
    // SMS Worker uses in-memory queue fallback - no external Redis required.

    // Log startup info
    logger.info("[Instrumentation] Server initialization complete", {
      nodeEnv: process.env.NODE_ENV,
      hasTaqnyatSMS: Boolean(process.env.TAQNYAT_BEARER_TOKEN && process.env.TAQNYAT_SENDER_NAME),
      hasEncryption: Boolean(process.env.ENCRYPTION_KEY || process.env.PII_ENCRYPTION_KEY),
    });

    // Initialize Sentry error tracking (if DSN configured)
    try {
      const { initSentryServer, isSentryEnabled } = await import("@/lib/sentry");
      if (isSentryEnabled()) {
        initSentryServer();
        logger.info("[Instrumentation] Sentry error tracking initialized");
      } else {
        logger.info("[Instrumentation] Sentry not enabled (no DSN or not production)");
      }
    } catch (sentryError) {
      logger.warn("[Instrumentation] Sentry initialization failed", {
        error: sentryError instanceof Error ? sentryError.message : String(sentryError),
      });
      // Don't throw - app should continue without Sentry
    }
  } catch (error) {
    logger.error("[Instrumentation] Initialization error", {
      error: error instanceof Error ? error.message : String(error),
    });
    // In production, re-throw to prevent boot with missing/invalid config
    // In non-production, log and continue to allow development flexibility
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }
}
