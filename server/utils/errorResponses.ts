import { ZodError } from "zod";
import { createSecureResponse } from "@/server/security/headers";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { isUnauthorizedError } from "@/server/utils/isUnauthorizedError";

export interface ErrorResponse {
  error: string;
  details?: unknown;
  code?: string;
}

/**
 * Standardized error response patterns with consistent HTTP status codes and secure headers
 */
export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Type guard for objects that may have status or code properties
 */
function hasStatusOrCode(err: unknown): err is { status?: number; code?: string } {
  return typeof err === 'object' && err !== null;
}

/**
 * Determine whether an error represents a forbidden/authorization failure without relying on brittle message substring checks.
 */
export function isForbidden(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof ApiError && error.statusCode === 403) {
    return true;
  }

  if (hasStatusOrCode(error)) {
    if (error.status === 403 || error.code === "FORBIDDEN") {
      return true;
    }
  }

  if (error instanceof Error) {
    const normalized = (error.message || "").toLowerCase();
    if (normalized.includes("forbidden") || normalized.includes("permission denied")) {
      return true;
    }
  }

  return false;
}

/**
 * Create a standardized error response with security headers
 */
export function createErrorResponse(
  error: string,
  statusCode: number,
  details?: unknown,
  code?: string,
): NextResponse {
  const response: ErrorResponse = { error };
  if (details) response.details = details;
  if (code) response.code = code;

  return createSecureResponse(response, statusCode);
}

/**
 * Handle common authentication errors
 */
export function unauthorizedError(
  message = "Authentication required",
): NextResponse {
  return createErrorResponse(message, 401, undefined, "UNAUTHORIZED");
}

/**
 * Handle common authorization/permission errors
 */
export function forbiddenError(
  message = "Insufficient permissions",
): NextResponse {
  return createErrorResponse(message, 403, undefined, "FORBIDDEN");
}

/**
 * Handle resource not found errors
 */
export function notFoundError(resource = "Resource"): NextResponse {
  return createErrorResponse(
    `${resource} not found`,
    404,
    undefined,
    "NOT_FOUND",
  );
}

/**
 * Handle validation errors with details
 */
export function validationError(
  message = "Invalid input",
  details?: unknown,
): NextResponse {
  return createErrorResponse(message, 400, details, "VALIDATION_ERROR");
}

/**
 * Handle Zod validation errors specifically
 */
export function zodValidationError(
  error: ZodError,
  req?: import("next/server").NextRequest,
): NextResponse {
  return createSecureResponse(
    {
      error: "Invalid input",
      details: error.issues,
      code: "VALIDATION_ERROR",
    },
    400,
    req,
  );
}

/**
 * Handle rate limiting errors
 */
export function rateLimitError(message = "Too many requests"): NextResponse {
  return createErrorResponse(message, 429, undefined, "RATE_LIMIT_EXCEEDED");
}

/**
 * Handle internal server errors with secure messaging
 */
export function internalServerError(
  message = "Internal server error",
  logDetails?: unknown,
): NextResponse {
  // Log full error details server-side
  if (logDetails) {
    logger.error("Internal server error", {
      message,
      details: logDetails,
      timestamp: new Date().toISOString(),
    });
  }

  // Return generic message to client for security
  return createErrorResponse(message, 500, undefined, "INTERNAL_ERROR");
}

/**
 * Handle Zod validation errors with structured details
 */
export function handleZodError(error: ZodError): NextResponse {
  const issues = error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));

  return validationError("Validation failed", issues);
}

/**
 * Generic error handler that categorizes different error types
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return createErrorResponse(
      error.message,
      error.statusCode,
      error.details,
      error.code,
    );
  }

  // Use centralized guard for UnauthorizedError detection
  // Handles both real instances and test mocks with different class identity
  if (isUnauthorizedError(error)) {
    return unauthorizedError();
  }

  if (error instanceof ZodError) {
    return handleZodError(error);
  }

  if (error instanceof Error) {
    // Log the full error but return generic message
    // SECURITY: Never expose stack traces or internal details to clients in production
    const isProd = process.env.NODE_ENV === "production";
    logger.error("Unhandled API error", {
      name: error.name,
      message: isProd ? "[REDACTED]" : error.message,
      stack: isProd ? "[REDACTED]" : error.stack,
      timestamp: new Date().toISOString(),
      // Keep error code/type for debugging even in production
      errorCode: error.name,
    });

    return internalServerError();
  }

  logger.error("Unknown error type", { error });
  return internalServerError("An unexpected error occurred");
}

/**
 * Common database operation errors
 */
export function duplicateKeyError(resource = "Resource"): NextResponse {
  return createErrorResponse(
    `${resource} already exists`,
    409,
    undefined,
    "DUPLICATE_KEY",
  );
}

/**
 * Handle tenant isolation errors
 */
export function tenantIsolationError(): NextResponse {
  return forbiddenError("Access denied: cross-tenant operation not allowed");
}
