/**
 * Centralized guard for UnauthorizedError detection
 *
 * This utility provides a consistent way to detect UnauthorizedError across
 * the codebase, handling both real instances and mocked classes (test environments).
 *
 * The duck-type check (error.name === 'UnauthorizedError') ensures that:
 * - Production code works with real UnauthorizedError instances
 * - Test mocks work even when class identity differs across module boundaries
 *
 * @module server/utils/isUnauthorizedError
 */

import { UnauthorizedError } from "@/server/middleware/withAuthRbac";

/**
 * Type guard to check if an error is an UnauthorizedError.
 *
 * This handles:
 * - Direct instanceof checks (production)
 * - Duck-type name checks (test mocks with different class identity)
 * - Status code checks (HTTP response-like errors)
 * - Code property checks (standardized error codes)
 *
 * @param error - The error to check
 * @returns true if the error represents an unauthorized access attempt
 *
 * @example
 * ```typescript
 * try {
 *   const user = await getSessionUser(req);
 * } catch (error) {
 *   if (isUnauthorizedError(error)) {
 *     return unauthorizedError();
 *   }
 *   return internalServerError();
 * }
 * ```
 */
export function isUnauthorizedError(error: unknown): boolean {
  // Fast path: direct instanceof check (production)
  if (error instanceof UnauthorizedError) {
    return true;
  }

  // Duck-type check: name property (handles test mocks)
  if (error instanceof Error && error.name === "UnauthorizedError") {
    return true;
  }

  // Additional checks for HTTP-like errors
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    (error as { status: number }).status === 401
  ) {
    return true;
  }

  // Check for standardized error codes
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code: string }).code === "UNAUTHORIZED"
  ) {
    return true;
  }

  return false;
}

/**
 * Re-export UnauthorizedError for convenience when both are needed
 */
export { UnauthorizedError };
