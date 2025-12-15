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
      
      // 🔒 SECURITY: Enforce safety guards in BOTH production AND preview
      const isEnforcedEnv = guardResult.environment === 'production' || guardResult.environment === 'preview';
      
      if (!guardResult.passed && isEnforcedEnv) {
        logger.error("[Instrumentation] Environment safety guards failed", {
          errors: guardResult.errors,
          environment: guardResult.environment,
        });
        // Fail startup in production/preview with safety violations
        throw new Error(`${guardResult.environment} environment safety guards failed; see logs for details`);
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
      // 🔒 SECURITY: Re-throw to stop startup in production OR preview
      const isEnforcedEnv = 
        process.env.NODE_ENV === "production" || 
        process.env.VERCEL_ENV === "production" ||
        process.env.VERCEL_ENV === "preview";
      
      if (isEnforcedEnv) {
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
      // Stop startup in production to avoid running with invalid secrets/config
      throw new Error("Environment validation failed; see logs for details");
    }

    // Initialize SMS worker if Redis is configured
    if (process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL) {
      const { startSMSWorker } = await import("@/lib/queues/sms-queue");
      const worker = startSMSWorker();

      if (worker) {
        logger.info("[Instrumentation] SMS Worker started successfully");
      } else {
        logger.info("[Instrumentation] SMS Worker not started (Redis not configured or disabled)");
      }
    } else {
      logger.info("[Instrumentation] Skipping SMS Worker (no Redis configuration)");
    }

    // Log startup info
    logger.info("[Instrumentation] Server initialization complete", {
      nodeEnv: process.env.NODE_ENV,
      hasRedis: Boolean(process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL),
      hasTaqnyatSMS: Boolean(process.env.TAQNYAT_BEARER_TOKEN && process.env.TAQNYAT_SENDER_NAME),
      hasEncryption: Boolean(process.env.ENCRYPTION_KEY || process.env.PII_ENCRYPTION_KEY),
    });
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
