/**
 * @module lib/errors/ErrorResponse
 * @description Standardized error response utility for consistent API error handling.
 *
 * Provides type-safe error codes, correlation IDs, and i18n-ready error structures
 * across all API routes. Implements Zero-Tolerance Gate 2.G compliance.
 *
 * @features
 * - Standardized error codes (40+ predefined codes)
 * - Correlation IDs for debugging (traces across services)
 * - Type-safe error handling (ErrorCode enum)
 * - i18n-ready error messages (client translates based on code)
 * - Consistent JSON structure ({ error, code, correlationId, details })
 * - HTTP status code mapping (401, 403, 404, 429, 500, etc.)
 *
 * @usage
 * ```typescript
 * import { ErrorResponse, ERROR_CODES } from '@/lib/errors/ErrorResponse';
 * 
 * return ErrorResponse(
 *   ERROR_CODES.UNAUTHORIZED,
 *   'Session expired',
 *   401,
 *   { userId: session.user.id }
 * );
 * ```
 *
 * @compliance
 * Zero-Tolerance Gate 2.G: All API routes MUST use standardized error codes.
 */

import { NextResponse } from "next/server";

/**
 * Standard Error Codes
 * These codes map to user-facing error messages in the frontend
 */
export const ERROR_CODES = {
  // Authentication & Authorization (40x)
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",

  // Validation (400)
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INVALID_FORMAT: "INVALID_FORMAT",

  // Resource Errors (404, 409)
  NOT_FOUND: "NOT_FOUND",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",

  // Rate Limiting (429)
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",

  // Server Errors (500)
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",

  // Business Logic Errors
  BUSINESS_RULE_VIOLATION: "BUSINESS_RULE_VIOLATION",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  OPERATION_NOT_ALLOWED: "OPERATION_NOT_ALLOWED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Standard Error Response Structure
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    correlationId: string;
    timestamp: string;
    details?: Record<string, unknown>;
    path?: string;
  };
}

/**
 * Standard Error Response Options
 */
export interface ErrorResponseOptions {
  code: ErrorCode;
  message: string;
  correlationId?: string;
  details?: Record<string, unknown>;
  path?: string;
  statusCode?: number;
}

/**
 * Creates a standardized error response
 *
 * @example
 * ```typescript
 * return createErrorResponse({
 *   code: ERROR_CODES.VALIDATION_ERROR,
 *   message: 'Invalid email format',
 *   correlationId: crypto.randomUUID(),
 *   details: { field: 'email', value: body.email },
 *   statusCode: 400,
 * });
 * ```
 */
export function createErrorResponse(
  options: ErrorResponseOptions,
): NextResponse<ErrorResponse> {
  const {
    code,
    message,
    correlationId = crypto.randomUUID(),
    details,
    path,
    statusCode = 500,
  } = options;

  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
      ...(details && { details }),
      ...(path && { path }),
    },
  };

  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * Helper: 400 Bad Request
 */
export function badRequest(
  message: string,
  details?: Record<string, unknown>,
  correlationId?: string,
): NextResponse<ErrorResponse> {
  return createErrorResponse({
    code: ERROR_CODES.INVALID_INPUT,
    message,
    details,
    correlationId,
    statusCode: 400,
  });
}

/**
 * Helper: 401 Unauthorized
 */
export function unauthorized(
  message: string = "Authentication required",
  correlationId?: string,
): NextResponse<ErrorResponse> {
  return createErrorResponse({
    code: ERROR_CODES.UNAUTHORIZED,
    message,
    correlationId,
    statusCode: 401,
  });
}

/**
 * Helper: 403 Forbidden
 */
export function forbidden(
  message: string = "Insufficient permissions",
  correlationId?: string,
): NextResponse<ErrorResponse> {
  return createErrorResponse({
    code: ERROR_CODES.FORBIDDEN,
    message,
    correlationId,
    statusCode: 403,
  });
}

/**
 * Helper: 404 Not Found
 */
export function notFound(
  message: string = "Resource not found",
  details?: Record<string, unknown>,
  correlationId?: string,
): NextResponse<ErrorResponse> {
  return createErrorResponse({
    code: ERROR_CODES.NOT_FOUND,
    message,
    details,
    correlationId,
    statusCode: 404,
  });
}

/**
 * Helper: 409 Conflict
 */
export function conflict(
  message: string,
  details?: Record<string, unknown>,
  correlationId?: string,
): NextResponse<ErrorResponse> {
  return createErrorResponse({
    code: ERROR_CODES.CONFLICT,
    message,
    details,
    correlationId,
    statusCode: 409,
  });
}

/**
 * Helper: 429 Rate Limit Exceeded
 */
export function rateLimitExceeded(
  message: string = "Too many requests",
  correlationId?: string,
): NextResponse<ErrorResponse> {
  return createErrorResponse({
    code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
    message,
    correlationId,
    statusCode: 429,
  });
}

/**
 * Helper: 500 Internal Server Error
 */
export function serverError(
  message: string = "Internal server error",
  details?: Record<string, unknown>,
  correlationId?: string,
): NextResponse<ErrorResponse> {
  return createErrorResponse({
    code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    message,
    details,
    correlationId,
    statusCode: 500,
  });
}

/**
 * Helper: 503 Service Unavailable
 */
export function serviceUnavailable(
  message: string = "Service temporarily unavailable",
  correlationId?: string,
): NextResponse<ErrorResponse> {
  return createErrorResponse({
    code: ERROR_CODES.SERVICE_UNAVAILABLE,
    message,
    correlationId,
    statusCode: 503,
  });
}
