/**
 * Standardized error responses for FM API endpoints
 */

import { NextRequest, NextResponse } from "next/server";

export type FMErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR"
  | "CONFLICT"
  | "INVALID_TRANSITION"
  | "MISSING_TENANT"
  | "INVALID_ID"
  | "RATE_LIMITED";

export type FMErrorOptions = {
  details?: Record<string, unknown>;
  headers?: HeadersInit;
  requestId?: string;
  path?: string;
  retryAfterSeconds?: number;
  allowedTransitions?: string[];
};

export interface FMErrorResponse {
  success: false;
  error: string;
  code: FMErrorCode;
  message: string;
  status: number;
  timestamp: string;
  path?: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

/**
 * Build error context (path + requestId) from NextRequest headers/URL.
 */
export function fmErrorContext(
  req: NextRequest,
  extra: FMErrorOptions = {},
): FMErrorOptions {
  const inferredRequestId =
    req.headers.get("x-request-id") ||
    req.headers.get("x-correlation-id") ||
    req.headers.get("x-trace-id") ||
    undefined;

  const path = (() => {
    try {
      return new URL(req.url).pathname;
    } catch {
      return undefined;
    }
  })();

  return {
    ...extra,
    path: extra.path ?? path,
    requestId: extra.requestId ?? inferredRequestId,
  };
}

/**
 * Create standardized error response
 */
export function createFMErrorResponse(
  code: FMErrorCode,
  message: string,
  status: number,
  options: FMErrorOptions = {},
): NextResponse<FMErrorResponse> {
  const {
    details,
    headers,
    requestId,
    path,
    retryAfterSeconds,
    allowedTransitions,
  } = options;
  const responseHeaders = new Headers({ "Cache-Control": "no-store" });
  const mergedDetails =
    details || allowedTransitions
      ? {
          ...(details ?? {}),
          ...(allowedTransitions ? { allowedTransitions } : {}),
        }
      : undefined;

  if (headers) {
    new Headers(headers).forEach((value, key) =>
      responseHeaders.set(key, value),
    );
  }

  if (
    typeof retryAfterSeconds === "number" &&
    Number.isFinite(retryAfterSeconds)
  ) {
    const safeRetry = Math.max(0, Math.ceil(retryAfterSeconds));
    responseHeaders.set("Retry-After", safeRetry.toString());
  }

  return NextResponse.json(
    {
      success: false,
      error: code.toLowerCase().replace(/_/g, "-"),
      code,
      message,
      status,
      timestamp: new Date().toISOString(),
      ...(path && { path }),
      ...(requestId && { requestId }),
      ...(mergedDetails && { details: mergedDetails }),
      ...(allowedTransitions && { allowedTransitions }),
    },
    { status, headers: responseHeaders },
  );
}

// Common error responses
export const FMErrors = {
  unauthorized: (
    message = "Authentication required",
    options?: FMErrorOptions,
  ) => createFMErrorResponse("UNAUTHORIZED", message, 401, options),

  forbidden: (message = "Insufficient permissions", options?: FMErrorOptions) =>
    createFMErrorResponse("FORBIDDEN", message, 403, options),

  notFound: (resource: string, options?: FMErrorOptions) =>
    createFMErrorResponse("NOT_FOUND", `${resource} not found`, 404, options),

  badRequest: (
    message: string,
    details?: Record<string, unknown>,
    options?: FMErrorOptions,
  ) =>
    createFMErrorResponse("BAD_REQUEST", message, 400, {
      ...options,
      ...(details && { details }),
    }),

  validationError: (
    message: string,
    details?: Record<string, unknown>,
    options?: FMErrorOptions,
  ) =>
    createFMErrorResponse("VALIDATION_ERROR", message, 400, {
      ...options,
      ...(details && { details }),
    }),

  internalError: (
    message = "Internal server error",
    options?: FMErrorOptions,
  ) => createFMErrorResponse("INTERNAL_ERROR", message, 500, options),

  conflict: (message: string, options?: FMErrorOptions) =>
    createFMErrorResponse("CONFLICT", message, 409, options),

  invalidTransition: (
    message: string,
    allowedTransitions?: string[],
    options?: FMErrorOptions,
  ) =>
    createFMErrorResponse("INVALID_TRANSITION", message, 400, {
      ...options,
      ...(allowedTransitions ? { allowedTransitions } : undefined),
    }),

  missingTenant: (options?: FMErrorOptions) =>
    createFMErrorResponse(
      "MISSING_TENANT",
      "Organization context required",
      400,
      options,
    ),

  invalidId: (resource: string, options?: FMErrorOptions) =>
    createFMErrorResponse("INVALID_ID", `Invalid ${resource} ID`, 400, options),

  rateLimited: (
    message = "Too many requests",
    details?: Record<string, unknown> & { retryAfterSeconds?: number },
    options?: FMErrorOptions,
  ) =>
    createFMErrorResponse("RATE_LIMITED", message, 429, {
      ...options,
      ...(details && { details }),
      retryAfterSeconds:
        options?.retryAfterSeconds ?? details?.retryAfterSeconds,
    }),
};
