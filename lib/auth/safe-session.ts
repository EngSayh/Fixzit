/**
 * Auth-infra-aware session helper
 * @module lib/auth/safe-session
 *
 * 🔒 SECURITY: Distinguishes between authentication failures (401) and
 * infrastructure failures (503) to prevent masking outages as auth errors.
 *
 * @example
 * ```ts
 * import { getSessionOrError } from "@/lib/auth/safe-session";
 *
 * const result = await getSessionOrError(req, { route: "fm:work-orders" });
 * if (!result.ok) {
 *   return result.response; // Already formatted as 401 or 503
 * }
 * const user = result.session;
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "@/server/middleware/withAuthRbac";
import { logger } from "@/lib/logger";
import { createSecureResponse } from "@/server/security/headers";

/**
 * Custom error class for auth infrastructure failures
 * Distinguished from UnauthorizedError to enable 503 responses
 */
export class AuthInfraError extends Error {
  public readonly statusCode = 503;
  public readonly correlationId: string;

  constructor(message: string, correlationId: string) {
    super(message);
    this.name = "AuthInfraError";
    this.correlationId = correlationId;
  }
}

export type SessionResult =
  | { ok: true; session: SessionUser }
  | { ok: false; response: NextResponse; isInfraError: boolean };

export interface GetSessionOptions {
  /** Route identifier for logging (e.g., "fm:work-orders") */
  route?: string;
  /** Whether to allow unauthenticated access (returns null session) */
  allowAnonymous?: boolean;
}

/**
 * Get session with infrastructure-aware error handling
 *
 * Returns discriminated union:
 * - { ok: true, session: SessionUser } on success
 * - { ok: false, response: NextResponse, isInfraError: boolean } on failure
 *
 * When isInfraError is true, the response is 503 (Service Unavailable)
 * When isInfraError is false, the response is 401 (Unauthorized)
 */
export async function getSessionOrError(
  req: NextRequest,
  options?: GetSessionOptions
): Promise<SessionResult> {
  const correlationId = crypto.randomUUID();
  const routePrefix = options?.route ? `[${options.route}]` : "[auth]";

  try {
    const session = await getSessionUser(req);

    // Valid session
    return { ok: true, session };
  } catch (err) {
    // Determine if this is an infra error vs auth error
    const isInfraError = isAuthInfrastructureError(err);

    if (isInfraError) {
      // Log as error with correlation ID for ops debugging
      logger.error(`${routePrefix} Auth infrastructure error`, {
        correlationId,
        error: err instanceof Error ? err.message : String(err),
        metric: "auth_infra_failure",
        url: req.url,
      });

      // Return 503 Service Unavailable
      const response = createSecureResponse(
        {
          error: "Authentication service temporarily unavailable",
          code: "AUTH_INFRA_ERROR",
          retryable: true,
          correlationId,
        },
        503,
        req
      );

      return { ok: false, response, isInfraError: true };
    } else {
      // Standard auth failure - user is not authenticated
      logger.debug(`${routePrefix} Authentication failed`, {
        correlationId,
        url: req.url,
      });

      const response = createSecureResponse(
        { error: "Unauthorized" },
        401,
        req
      );

      return { ok: false, response, isInfraError: false };
    }
  }
}

/**
 * Get session or null with infrastructure-aware error handling
 *
 * For routes that allow anonymous access but need to know if
 * the user is authenticated when they are.
 *
 * Returns:
 * - { ok: true, session: SessionUser | null } on success (null = anonymous)
 * - { ok: false, response: NextResponse } only on infra error
 */
export async function getSessionOrNull(
  req: NextRequest,
  options?: GetSessionOptions
): Promise<
  | { ok: true; session: SessionUser | null }
  | { ok: false; response: NextResponse }
> {
  const correlationId = crypto.randomUUID();
  const routePrefix = options?.route ? `[${options.route}]` : "[auth]";

  try {
    const session = await getSessionUser(req);
    return { ok: true, session };
  } catch (err) {
    // Determine if this is an infra error vs auth error
    const isInfraError = isAuthInfrastructureError(err);

    if (isInfraError) {
      // Log as error with correlation ID for ops debugging
      logger.error(`${routePrefix} Auth infrastructure error`, {
        correlationId,
        error: err instanceof Error ? err.message : String(err),
        metric: "auth_infra_failure",
        url: req.url,
      });

      // Return 503 Service Unavailable
      const response = createSecureResponse(
        {
          error: "Authentication service temporarily unavailable",
          code: "AUTH_INFRA_ERROR",
          retryable: true,
          correlationId,
        },
        503,
        req
      );

      return { ok: false, response };
    } else {
      // Normal auth failure = anonymous user
      return { ok: true, session: null };
    }
  }
}

/**
 * Determine if an error is an infrastructure error vs an auth error
 *
 * Infrastructure errors include:
 * - Database connection failures
 * - Redis/cache failures
 * - Network timeouts
 * - Internal server errors from auth service
 *
 * Auth errors include:
 * - Missing/expired token
 * - Invalid credentials
 * - Revoked session
 */
function isAuthInfrastructureError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;

  const message = err.message.toLowerCase();
  const name = err.name;

  // Known infrastructure error patterns
  const infraPatterns = [
    "econnrefused",
    "enotfound",
    "etimedout",
    "econnreset",
    "connection refused",
    "connection reset",
    "network error",
    "socket hang up",
    "mongo",
    "redis",
    "database",
    "db connection",
    "internal server error",
    "service unavailable",
    "timeout",
    "ehostunreach",
    "dns",
    "ssl",
    "certificate",
  ];

  // Check message for infra patterns
  if (infraPatterns.some((pattern) => message.includes(pattern))) {
    return true;
  }

  // Check error types that indicate infra issues
  const infraErrorTypes = [
    "MongoNetworkError",
    "MongoServerError",
    "MongoTimeoutError",
    "RedisError",
    "FetchError",
    "AbortError",
    "TypeError", // Often from network issues
  ];

  if (infraErrorTypes.includes(name)) {
    return true;
  }

  // Check for specific error codes
  const errorWithCode = err as { code?: string | number };
  if (errorWithCode.code) {
    const code = String(errorWithCode.code).toLowerCase();
    if (
      code.startsWith("econnr") ||
      code.startsWith("etime") ||
      code.startsWith("enotf") ||
      code === "enoent"
    ) {
      return true;
    }
  }

  return false;
}

export { SessionUser };
