import { ZodError } from 'zod';
import { createSecureResponse } from '@/server/security/headers';
import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'crypto';

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
  public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Create a standardized error response with security headers
 */
export function createErrorResponse(
  error: string,
  statusCode: number,
  details?: unknown,
  code?: string
): NextResponse {
  const response: ErrorResponse = { error };
  if (details) response.details = details;
  if (code) response.code = code;
  
  return createSecureResponse(response, statusCode);
}

/**
 * Handle common authentication errors
 */
export function unauthorizedError(message = 'Authentication required'): NextResponse {
  return createErrorResponse(message, 401, undefined, 'UNAUTHORIZED');
}

/**
 * Handle common authorization/permission errors  
 */
export function forbiddenError(message = 'Insufficient permissions'): NextResponse {
  return createErrorResponse(message, 403, undefined, 'FORBIDDEN');
}

/**
 * Handle resource not found errors
 */
export function notFoundError(resource = 'Resource'): NextResponse {
  return createErrorResponse(`${resource} not found`, 404, undefined, 'NOT_FOUND');
}

/**
 * Handle validation errors with details
 */
export function validationError(message = 'Invalid input', details?: unknown): NextResponse {
  return createErrorResponse(message, 400, details, 'VALIDATION_ERROR');
}

/**
 * Handle Zod validation errors specifically
 */
export function zodValidationError(error: ZodError, req?: import('next/server').NextRequest): NextResponse {
  return createSecureResponse(
    { 
      error: 'Invalid input', 
      details: error.issues,
      code: 'VALIDATION_ERROR'
    }, 
  400, 
  req
  );
}

/**
 * Handle rate limiting errors
 */
export function rateLimitError(message = 'Too many requests'): NextResponse {
  return createErrorResponse(message, 429, undefined, 'RATE_LIMIT_EXCEEDED');
}

/**
 * Handle internal server errors with secure messaging
 */
export function internalServerError(
  message = 'Internal server error',
  logDetails?: unknown
): NextResponse {
  // Log full error details server-side
  if (logDetails) {
    console.error('Internal server error:', {
      message,
      details: logDetails,
      timestamp: new Date().toISOString()
    });
  }
  
  // Return generic message to client for security
  return createErrorResponse(message, 500, undefined, 'INTERNAL_ERROR');
}

/**
 * Handle Zod validation errors with structured details
 */
export function handleZodError(error: ZodError): NextResponse {
  const issues = error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code
  }));
  
  return validationError('Validation failed', issues);
}

/**
 * Generic error handler that categorizes different error types
 */
export function handleApiError(
  error: unknown, 
  req?: NextRequest,
  correlationId?: string
): NextResponse {
  // Generate correlation ID if not provided
  const cid = correlationId || crypto.randomUUID();
  
  if (error instanceof ApiError) {
    return req 
      ? createSecureResponse({ error: error.message, details: error.details, code: error.code, correlationId: cid }, error.statusCode, req)
      : createErrorResponse(error.message, error.statusCode, error.details, error.code);
  }
  
  if (error instanceof ZodError) {
    return req ? zodValidationError(error, req) : handleZodError(error);
  }
  
  if (error instanceof Error) {
    // Log the full error but return generic message
    // SECURITY: Never expose stack traces or internal details to clients in production
    console.error('Unhandled API error:', {
      correlationId: cid,
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? '[REDACTED]' : error.stack,
      timestamp: new Date().toISOString()
    });
    
    return req 
      ? createSecureResponse({ error: 'Internal server error', correlationId: cid }, 500, req)
      : internalServerError();
  }
  
  // Unknown error type
  console.error('Unknown error type:', {
    correlationId: cid,
    error,
    timestamp: new Date().toISOString()
  });
  return req 
    ? createSecureResponse({ error: 'Internal server error', correlationId: cid }, 500, req)
    : internalServerError();
}

/**
 * Common database operation errors
 */
export function duplicateKeyError(resource = 'Resource'): NextResponse {
  return createErrorResponse(`${resource} already exists`, 409, undefined, 'DUPLICATE_KEY');
}

/**
 * Handle tenant isolation errors
 */
export function tenantIsolationError(): NextResponse {
  return forbiddenError('Access denied: cross-tenant operation not allowed');
}
