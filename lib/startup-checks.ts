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

  // Throw all errors at once for comprehensive startup feedback
  if (errors.length > 0) {
    throw new Error(
      `FATAL STARTUP ERRORS - Application cannot start:\n${errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}\n\n` +
        "Fix these configuration issues and restart the application.",
    );
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
