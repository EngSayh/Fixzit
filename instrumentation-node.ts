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
      
      if (!guardResult.passed && isTrueProduction) {
        logger.error("[Instrumentation] CRITICAL: Production environment safety guards failed", {
          errors: guardResult.errors,
          environment: guardResult.environment,
        });
        // BLOCK startup in true production only
        throw new Error(`Production environment safety guards failed; see logs for details`);
      }
      
      if (!guardResult.passed && isPreview) {
        logger.warn("[Instrumentation] Preview environment safety warnings", {
          errors: guardResult.errors,
          environment: guardResult.environment,
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
      // 🔒 SECURITY: Only re-throw in TRUE production
      const isTrueProduction = 
        process.env.NODE_ENV === "production" && 
        process.env.VERCEL_ENV === "production";
      
      if (isTrueProduction) {
        throw guardError;
      } else {
        logger.warn("[Instrumentation] Env guard failure in non-production, continuing with warnings");
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
    // CRITICAL: Wrapped in try-catch to prevent Redis issues from crashing boot
    if (process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL) {
      try {
        const { startSMSWorker } = await import("@/lib/queues/sms-queue");
        const worker = startSMSWorker();

        if (worker) {
          logger.info("[Instrumentation] SMS Worker started successfully");
        } else {
          logger.info("[Instrumentation] SMS Worker not started (Redis not configured or disabled)");
        }
      } catch (error) {
        logger.error("[Instrumentation] SMS Worker failed to start - Redis issue, continuing without queues", {
          error: error instanceof Error ? error.message : String(error),
        });
        // Don't throw - app should continue without SMS queue
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
