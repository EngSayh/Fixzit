import { NextResponse } from 'next/server';

export type SouqErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMITED';

interface SouqErrorResponse {
  error: string;
  code: SouqErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export function createSouqErrorResponse(
  code: SouqErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>
) {
  return NextResponse.json<SouqErrorResponse>(
    {
      error: code.toLowerCase().replace(/_/g, '-'),
      code,
      message,
      ...(details && { details }),
    },
    { status }
  );
}

export const SouqErrors = {
  validationError: (message: string, details?: Record<string, unknown>) =>
    createSouqErrorResponse('VALIDATION_ERROR', message, 400, details),

  notFound: (resource: string, details?: Record<string, unknown>) =>
    createSouqErrorResponse('NOT_FOUND', `${resource} not found`, 404, details),

  conflict: (message: string, details?: Record<string, unknown>) =>
    createSouqErrorResponse('CONFLICT', message, 409, details),

  unauthorized: (message = 'Authentication required') =>
    createSouqErrorResponse('UNAUTHORIZED', message, 401),

  forbidden: (message = 'Insufficient permissions') =>
    createSouqErrorResponse('FORBIDDEN', message, 403),

  rateLimited: (message = 'Too many requests', details?: Record<string, unknown>) =>
    createSouqErrorResponse('RATE_LIMITED', message, 429, details),

  internalError: (message = 'Something went wrong', details?: Record<string, unknown>) =>
    createSouqErrorResponse('INTERNAL_ERROR', message, 500, details),
};
