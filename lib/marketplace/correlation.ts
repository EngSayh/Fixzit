import { randomUUID } from "node:crypto";

/**
 * Marketplace Request Correlation Utilities
 *
 * Provides consistent correlation ID generation and tracking
 * for improved debugging and error tracking across marketplace operations
 */

export interface CorrelationContext {
  correlationId: string;
  timestamp: number;
  operation?: string;
  userId?: string;
  tenantId?: string;
}

/**
 * Generate a new correlation ID with context
 */
export function createCorrelationContext(
  options: {
    operation?: string;
    userId?: string;
    tenantId?: string;
  } = {},
): CorrelationContext {
  return {
    correlationId: randomUUID(),
    timestamp: Date.now(),
    ...options,
  };
}

/**
 * Create correlation headers for API requests
 */
export function getCorrelationHeaders(
  context: CorrelationContext,
): Record<string, string> {
  return {
    "X-Correlation-ID": context.correlationId,
    "X-Request-Timestamp": context.timestamp.toString(),
    ...(context.operation && { "X-Operation": context.operation }),
    ...(context.userId && { "X-User-ID": context.userId }),
    ...(context.tenantId && { "X-Tenant-ID": context.tenantId }),
  };
}

/**
 * Log with correlation context for debugging
 */
export function logWithCorrelation(
  level: "debug" | "info" | "warn" | "error",
  message: string,
  context: CorrelationContext,
  additional?: Record<string, unknown>,
): void {
  const logData = {
    ...context,
    message,
    ...additional,
  };

  console[level](`[MarketplaceCorrelation] ${message}`, logData);
}

/**
 * Extract correlation ID from error or create new one
 */
export function getErrorCorrelationId(error?: unknown): string {
  if (error instanceof Error) {
    try {
      const errorData = JSON.parse(error.message);
      if (errorData.correlationId) {
        return errorData.correlationId;
      }
    } catch {
      // Not a JSON error, continue to generate new ID
    }
  }
  return randomUUID();
}

/**
 * Enhance error with correlation context
 */
export function createCorrelatedError(
  message: string,
  context: CorrelationContext,
  errorDetails: {
    name?: string;
    code?: string;
    userMessageKey?: string;
    userMessage?: string;
    devMessage?: string;
  } = {},
): Error {
  const errorPayload = {
    name: errorDetails.name || "MarketplaceError",
    code: errorDetails.code || "UNKNOWN_ERROR",
    userMessageKey:
      errorDetails.userMessageKey || "marketplace.errors.fetch_failed",
    userMessage: errorDetails.userMessage || "An error occurred",
    devMessage: errorDetails.devMessage || message,
    ...context,
  };
  logWithCorrelation("error", message, context, errorDetails);
  return new Error(JSON.stringify(errorPayload));
}
