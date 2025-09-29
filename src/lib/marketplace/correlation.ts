import { randomUUID } from 'node:crypto';

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
export function createCorrelationContext(options: {
  operation?: string;
  userId?: string;
  tenantId?: string;
} = {}): CorrelationContext {
  return {
    correlationId: randomUUID(),
    timestamp: Date.now(),
    ...options,
  };
}

/**
 * Create correlation headers for API requests
 */
export function getCorrelationHeaders(context: CorrelationContext): Record<string, string> {
  return {
    'X-Correlation-ID': context.correlationId,
    'X-Request-Timestamp': context.timestamp.toString(),
    ...(context.operation && { 'X-Operation': context.operation }),
    ...(context.userId && { 'X-User-ID': context.userId }),
    ...(context.tenantId && { 'X-Tenant-ID': context.tenantId }),
  };
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
