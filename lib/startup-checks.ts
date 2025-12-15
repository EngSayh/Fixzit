import { requireEnv, TEST_JWT_SECRET } from "./env";

/**
 * Startup Validation - Fail Fast on Missing/Invalid Configuration
 *
 * This module validates critical environment variables at application startup.
 * Failures here should terminate the application before accepting any requests.
 *
 * IMPORTANT: Call validateStartup() from your app entry point (e.g., middleware.ts or layout.tsx)
 */

export function validateStartup(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const jwtSecret = requireEnv("JWT_SECRET", {
      testFallback: TEST_JWT_SECRET,
    });
    if (jwtSecret.length < 32) {
      errors.push(
        `JWT_SECRET must be at least 32 characters long. Current length: ${jwtSecret.length}`,
      );
    }
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    errors.push(error instanceof Error ? error.message : String(error));
  }

  // Tap Payments: Check for environment-aware keys based on TAP_ENVIRONMENT
  // IMPORTANT: This system uses TAP PAYMENTS ONLY (PayTabs removed)
  const tapEnvIsLive = process.env.TAP_ENVIRONMENT === "live" || process.env.NODE_ENV === "production";
  const tapSecretKey = tapEnvIsLive 
    ? process.env.TAP_LIVE_SECRET_KEY 
    : process.env.TAP_TEST_SECRET_KEY;
  const tapMissing = !tapSecretKey || !process.env.TAP_WEBHOOK_SECRET;
  
  if (tapMissing) {
    const tapEnvType = tapEnvIsLive ? "live" : "test";
    const keyName = tapEnvIsLive ? "TAP_LIVE_SECRET_KEY" : "TAP_TEST_SECRET_KEY";
    const msg = `Tap configuration incomplete: ${keyName} and/or TAP_WEBHOOK_SECRET missing (TAP_ENVIRONMENT: ${tapEnvType})`;
    if (process.env.NODE_ENV === "production") {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  }

  // Throw all errors at once for comprehensive startup feedback
  if (errors.length > 0) {
    throw new Error(
      `FATAL STARTUP ERRORS - Application cannot start:\n${errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}\n\n` +
        "Fix these configuration issues and restart the application.",
    );
  }

  if (warnings.length > 0) {
    for (const w of warnings) {
      // eslint-disable-next-line no-console -- startup warnings are intentional for operators
      console.warn(
        `[Startup Warning] ${w}. Configure these secrets to enable payment callbacks.`,
      );
    }
  }
}

/**
 * Module-level flag to track if startup validation has been executed
 */
let startupValidated = false;

/**
 * Validates all critical environment variables and marks validation as complete
 * Call this from your app entry point (e.g., middleware.ts or layout.tsx)
 * @throws {Error} If any validation fails - should crash the application
 */
export function validateStartupAndMark(): void {
  validateStartup();
  startupValidated = true;
}

/**
 * Get JWT secret with runtime enforcement
 *
 * This function ensures validateStartupAndMark() has been called before returning the secret.
 * In development, it allows a dev fallback if startup validation has been run.
 * In production, it requires a valid JWT_SECRET from environment variables.
 *
 * @returns JWT secret from environment or dev fallback (dev only, after validation)
 * @throws {Error} If validateStartupAndMark() has not been called or JWT_SECRET is missing in production
 */
export function getJWTSecret(): string {
  // Enforce that startup validation has been run
  if (!startupValidated) {
    throw new Error(
      "FATAL: getJWTSecret() called before validateStartupAndMark() was executed. " +
        "Call validateStartupAndMark() during application startup (e.g., in middleware.ts).",
    );
  }

  return requireEnv("JWT_SECRET", { testFallback: TEST_JWT_SECRET });
}
