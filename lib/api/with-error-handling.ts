/**
 * API Route Error Handling Middleware for Next.js App Router
 *
 * Provides consistent error handling for API routes, including:
 * - JSON parse error handling (request.json() failures)
 * - Structured error responses
 * - Logging integration
 * - Type-safe route handlers
 *
 * @module lib/api/with-error-handling
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
  requestId?: string;
}

/**
 * Standard API success response wrapper
 */
export interface ApiSuccessResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

/**
 * Route handler context with parsed body
 */
export interface RouteContext<TBody = unknown> {
  request: NextRequest;
  params: Record<string, string | string[]>;
  body?: TBody;
  requestId: string;
}

/**
 * Route handler function type
 */
export type RouteHandler<TBody = unknown, TResponse = unknown> = (
  context: RouteContext<TBody>
) => Promise<NextResponse<TResponse | ApiErrorResponse>>;

/**
 * Options for withErrorHandling middleware
 */
export interface WithErrorHandlingOptions {
  /**
   * Whether to parse JSON body (default: true for POST/PUT/PATCH)
   */
  parseBody?: boolean;
  /**
   * Custom error messages for specific status codes
   */
  errorMessages?: Record<number, string>;
  /**
   * Log level for errors (default: 'error')
   */
  logLevel?: "error" | "warn" | "info";
}

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number,
  options?: { code?: string; details?: unknown; requestId?: string }
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: options?.code,
      details: options?.details,
      requestId: options?.requestId,
    },
    { status }
  );
}

/**
 * Wrap API route handler with comprehensive error handling.
 *
 * Handles:
 * - JSON parse errors (request.json() failures)
 * - Unexpected exceptions
 * - Consistent error response format
 * - Request ID tracking
 * - Structured logging
 *
 * @example
 * ```typescript
 * // app/api/users/route.ts
 * import { withErrorHandling } from '@/lib/api/with-error-handling';
 *
 * export const POST = withErrorHandling<{ name: string }>(
 *   async ({ body, requestId }) => {
 *     const user = await createUser(body!);
 *     return NextResponse.json({ data: user });
 *   }
 * );
 * ```
 */
export function withErrorHandling<TBody = unknown, TResponse = unknown>(
  handler: RouteHandler<TBody, TResponse>,
  options: WithErrorHandlingOptions = {}
): (
  request: NextRequest,
  context: { params?: Promise<Record<string, string | string[]>> }
) => Promise<NextResponse> {
  const { logLevel = "error" } = options;

  return async (
    request: NextRequest,
    context: { params?: Promise<Record<string, string | string[]>> }
  ): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const url = request.url;
    const method = request.method;

    // Resolve params (Next.js 15+ uses Promise)
    const params = context.params ? await context.params : {};

    try {
      // Parse body for methods that typically have one
      let body: TBody | undefined;
      const shouldParseBody =
        options.parseBody ??
        ["POST", "PUT", "PATCH"].includes(method);

      if (shouldParseBody) {
        try {
          const text = await request.text();
          if (text) {
            body = JSON.parse(text) as TBody;
          }
        } catch (parseError) {
          logger.warn("[API] Invalid JSON body", {
            requestId,
            url,
            method,
            error:
              parseError instanceof Error
                ? parseError.message
                : "JSON parse failed",
          });

          return createErrorResponse(
            "Invalid JSON body",
            400,
            { code: "INVALID_JSON", requestId }
          );
        }
      }

      // Execute the handler
      const result = await handler({
        request,
        params,
        body,
        requestId,
      });

      return result;
    } catch (error) {
      // Log the error
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger[logLevel]("[API] Unhandled error", {
        requestId,
        url,
        method,
        error: errorMessage,
        stack: errorStack,
      });

      // Determine appropriate status code
      let status = 500;
      let code = "INTERNAL_ERROR";

      if (error instanceof Error) {
        // Check for common error patterns
        if (error.message.includes("not found")) {
          status = 404;
          code = "NOT_FOUND";
        } else if (
          error.message.includes("unauthorized") ||
          error.message.includes("authentication")
        ) {
          status = 401;
          code = "UNAUTHORIZED";
        } else if (
          error.message.includes("forbidden") ||
          error.message.includes("permission")
        ) {
          status = 403;
          code = "FORBIDDEN";
        } else if (error.message.includes("validation")) {
          status = 400;
          code = "VALIDATION_ERROR";
        }
      }

      // Use custom error message if provided
      const displayMessage =
        options.errorMessages?.[status] ?? errorMessage;

      return createErrorResponse(displayMessage, status, {
        code,
        requestId,
        // Only include details in development
        details:
          process.env.NODE_ENV === "development"
            ? { message: errorMessage, stack: errorStack }
            : undefined,
      });
    }
  };
}

/**
 * Helper to safely parse request body with validation
 *
 * @example
 * ```typescript
 * const body = await parseRequestBody<CreateUserInput>(request, {
 *   required: ['name', 'email'],
 * });
 * if (!body.success) {
 *   return createErrorResponse(body.error, 400);
 * }
 * ```
 */
export async function parseRequestBody<T extends object>(
  request: NextRequest,
  options?: { required?: (keyof T)[] }
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const text = await request.text();
    if (!text) {
      return { success: false, error: "Request body is empty" };
    }

    const data = JSON.parse(text) as T;

    // Validate required fields
    if (options?.required) {
      const missing = options.required.filter(
        (field) => !(field in data) || data[field] === undefined
      );
      if (missing.length > 0) {
        return {
          success: false,
          error: `Missing required fields: ${missing.join(", ")}`,
        };
      }
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid JSON body",
    };
  }
}

/**
 * Validation helper for route params
 */
export function validateParams<T extends Record<string, string>>(
  params: Record<string, string | string[]>,
  required: (keyof T)[]
): { success: true; data: T } | { success: false; error: string } {
  const result: Record<string, string> = {};

  for (const key of required) {
    const value = params[key as string];
    if (!value || Array.isArray(value)) {
      return {
        success: false,
        error: `Missing or invalid param: ${String(key)}`,
      };
    }
    result[key as string] = value;
  }

  return { success: true, data: result as T };
}
