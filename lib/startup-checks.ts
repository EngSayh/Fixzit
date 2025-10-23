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
 * Get JWT secret with development fallback
 * Only use after validateStartup() has been called
 */
export function getJWTSecret(): string {
  return process.env.JWT_SECRET || 'dev-only-secret-REPLACE-IN-PROD';
}
