/**
 * @module lib/errors/secureErrorResponse
 * @description Secure error response utility that sanitizes error messages.
 *
 * Prevents internal details leakage by filtering error messages and logging
 * original errors securely. Safe for production use in public APIs.
 *
 * @features
 * - Automatic error message sanitization (blocks sensitive patterns)
 * - Safe error pattern whitelist (Authentication, Unauthorized, Not found, etc.)
 * - Original error logging (development mode)
 * - Type-safe error handling (unknown → Error → string)
 * - Default fallback messages (prevents empty responses)
 * - Integration with marketplace security headers
 *
 * @usage
 * ```typescript
 * import { secureErrorResponse } from '@/lib/errors/secureErrorResponse';
 * 
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   return secureErrorResponse({
 *     error,
 *     defaultMessage: 'Operation failed',
 *     statusCode: 500,
 *     logError: true,
 *   });
 * }
 * ```
 *
 * @security
 * Prevents exposure of: stack traces, DB errors, internal paths, env variables.
 */

import { logger } from "@/lib/logger";
import { createSecureResponse } from "@/lib/marketplace/security";

export interface SecureErrorOptions {
  /** The raw error that occurred */
  error: unknown;
  /** User-friendly default message if error type is unknown */
  defaultMessage?: string;
  /** HTTP status code */
  statusCode?: number;
  /** Whether to log the original error to console (development only) */
  logError?: boolean;
}

/**
 * Known safe error types that can expose their messages
 */
const SAFE_ERROR_PATTERNS = [
  "Authentication required",
  "Invalid token",
  "Unauthenticated",
  "Unauthorized",
  "Not found",
  "Invalid input",
  "Validation failed",
  "Resource already exists",
  "Operation not allowed",
];

/**
 * Check if an error message is safe to expose to clients
 */
function isSafeErrorMessage(message: string): boolean {
  return SAFE_ERROR_PATTERNS.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase()),
  );
}

/**
 * Extract a safe error message from an error object
 */
function getSafeErrorMessage(error: unknown, defaultMessage: string): string {
  if (!(error instanceof Error)) {
    return defaultMessage;
  }

  // Only expose specific known-safe error messages
  if (isSafeErrorMessage(error.message)) {
    return error.message;
  }

  // For all other errors, return the default message
  return defaultMessage;
}

/**
 * Create a secure error response that doesn't leak internal details
 * 
 * @example
 * ```ts
 * try {
 *   const result = await dangerousOperation();
 *   return createSecureResponse({ success: true, data: result }, { status: 200 });
 * } catch (_error) {
   const error = _error instanceof Error ? _error : new Error(String(_error));
   void error;
 *   return createSecureErrorResponse({
 *     error,
 *     defaultMessage: 'Failed to complete operation',
 *     statusCode: 500,
 *   });
 * }
 * ```
 */
export function createSecureErrorResponse(
  options: SecureErrorOptions,
): Response {
  const {
    error,
    defaultMessage = "An unexpected error occurred",
    statusCode = 500,
    logError = process.env.NODE_ENV === "development",
  } = options;

  // Log error in development for debugging
  if (logError && error instanceof Error) {
    logger.error("[Secure Error Handler]", error, {
      name: error.name,
    });
  }

  // Get safe message
  const safeMessage = getSafeErrorMessage(error, defaultMessage);

  // Return secure response with proper ResponseInit
  return createSecureResponse(
    {
      success: false,
      error: safeMessage,
    },
    { status: statusCode },
  );
}
