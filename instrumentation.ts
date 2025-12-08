/**
 * Next.js Instrumentation
 *
 * This file is loaded when the Next.js server starts.
 * Used to initialize workers, validate config, and set up monitoring.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * @module instrumentation
 */

export async function register() {
  // Only run on server side
  if (typeof window !== "undefined") {
    return;
  }

  // Only run in Node.js runtime, not Edge
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  // Import logger dynamically to avoid Edge runtime issues
  const { logger } = await import("@/lib/logger");

  logger.info("[Instrumentation] Starting server initialization...");

  try {
    // Validate environment variables
    const { validateAllEnv } = await import("@/lib/env-validation");
    const envResult = validateAllEnv();

    if (!envResult.valid && process.env.NODE_ENV === "production") {
      logger.error("[Instrumentation] Environment validation failed", {
        errors: envResult.errors,
      });
      // Don't throw - let the app start but log errors
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
      hasTwilio: Boolean(process.env.TWILIO_ACCOUNT_SID),
      hasUnifonic: Boolean(process.env.UNIFONIC_APP_SID),
      hasEncryption: Boolean(process.env.ENCRYPTION_KEY || process.env.PII_ENCRYPTION_KEY),
    });
  } catch (error) {
    const { logger: loggerFallback } = await import("@/lib/logger");
    loggerFallback.error("[Instrumentation] Initialization error", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - let the app start but log the error
  }
}
