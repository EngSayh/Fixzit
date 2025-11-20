/**
 * Standardized error responses for FM API endpoints
 */

import { NextResponse } from 'next/server';

export type FMErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'CONFLICT'
  | 'INVALID_TRANSITION'
  | 'MISSING_TENANT'
  | 'INVALID_ID'
  | 'RATE_LIMITED';

interface FMErrorResponse {
  error: string;
  code: FMErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Create standardized error response
 */
export function createFMErrorResponse(
  code: FMErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse<FMErrorResponse> {
  return NextResponse.json(
    {
      error: code.toLowerCase().replace(/_/g, '-'),
      code,
      message,
      ...(details && { details }),
    },
    { status }
  );
}

// Common error responses
export const FMErrors = {
  unauthorized: (message = 'Authentication required') =>
    createFMErrorResponse('UNAUTHORIZED', message, 401),

  forbidden: (message = 'Insufficient permissions') =>
    createFMErrorResponse('FORBIDDEN', message, 403),

  notFound: (resource: string) =>
    createFMErrorResponse('NOT_FOUND', `${resource} not found`, 404),

  badRequest: (message: string, details?: Record<string, unknown>) =>
    createFMErrorResponse('BAD_REQUEST', message, 400, details),

  validationError: (message: string, details?: Record<string, unknown>) =>
    createFMErrorResponse('VALIDATION_ERROR', message, 400, details),

  internalError: (message = 'Internal server error') =>
    createFMErrorResponse('INTERNAL_ERROR', message, 500),

  conflict: (message: string) =>
    createFMErrorResponse('CONFLICT', message, 409),

  invalidTransition: (message: string, allowedTransitions?: string[]) =>
    createFMErrorResponse(
      'INVALID_TRANSITION',
      message,
      400,
      allowedTransitions ? { allowedTransitions } : undefined
    ),

  missingTenant: () =>
    createFMErrorResponse('MISSING_TENANT', 'Organization context required', 400),

  invalidId: (resource: string) =>
    createFMErrorResponse('INVALID_ID', `Invalid ${resource} ID`, 400),

  rateLimited: (message = 'Too many requests', details?: Record<string, unknown>) =>
    createFMErrorResponse('RATE_LIMITED', message, 429, details),
};
