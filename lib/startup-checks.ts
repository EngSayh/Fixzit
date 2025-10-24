/**
 * Startup Validation - Fail Fast on Missing/Invalid Configuration
 * 
 * This module validates critical environment variables at application startup.
 * Failures here should terminate the application before accepting any requests.
 * 
 * IMPORTANT: Call validateStartup() from your app entry point (e.g., middleware.ts or layout.tsx)
 */

/**
 * Validates all critical environment variables required for production
 * @throws {Error} If any validation fails - should crash the application
 */
export function validateStartup(): void {
  const errors: string[] = [];

  // JWT_SECRET validation
  if (process.env.NODE_ENV === 'production') {
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret || jwtSecret.trim().length === 0) {
      errors.push('JWT_SECRET is required in production environment');
    } else if (jwtSecret.length < 32) {
      errors.push(`JWT_SECRET must be at least 32 characters for security. Current length: ${jwtSecret.length}`);
    }
  }

  // Throw all errors at once for comprehensive startup feedback
  if (errors.length > 0) {
    throw new Error(
      `FATAL STARTUP ERRORS - Application cannot start:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n\n` +
      'Fix these configuration issues and restart the application.'
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
  const secret = process.env.JWT_SECRET;
  
  // Enforce that startup validation has been run
  if (!startupValidated) {
    throw new Error(
      'FATAL: getJWTSecret() called before validateStartupAndMark() was executed. ' +
      'Call validateStartupAndMark() during application startup (e.g., in middleware.ts).'
    );
  }
  
  // In production, never use dev fallback
  if (process.env.NODE_ENV === 'production') {
    if (!secret) {
      throw new Error('FATAL: JWT_SECRET is required in production but not set.');
    }
    return secret;
  }
  
  // In development, allow dev fallback only after validation (meets 32+ char requirement)
  return secret || 'dev-only-secret-REPLACE-IN-PRODUCTION-WITH-STRONG-KEY';
}
