import { NextResponse } from 'next/server';
import { ProblemDetails } from './types';

export function createProblemResponse(
  problem: ProblemDetails,
  status: number = problem.status
): NextResponse {
  return new NextResponse(JSON.stringify(problem), {
    status,
    headers: {
      'Content-Type': 'application/problem+json',
      'X-Error-Code': problem.code || 'UNKNOWN',
      'X-Error-Type': problem.type || 'about:blank'
    }
  });
}

export function createValidationErrorResponse(
  errors: Array<{ path: string; message: string }>,
  instance?: string
): NextResponse {
  return createProblemResponse({
    type: 'https://docs.fixzit.com/errors/validation',
    title: 'Validation Error',
    status: 422,
    detail: 'The request contains invalid data',
    instance,
    errors
  }, 422);
}

export function createAuthenticationErrorResponse(instance?: string): NextResponse {
  return createProblemResponse({
    type: 'https://docs.fixzit.com/errors/authentication',
    title: 'Authentication Required',
    status: 401,
    detail: 'You must be logged in to access this resource',
    instance
  }, 401);
}

export function createAuthorizationErrorResponse(instance?: string): NextResponse {
  return createProblemResponse({
    type: 'https://docs.fixzit.com/errors/authorization',
    title: 'Access Denied',
    status: 403,
    detail: 'You do not have permission to access this resource',
    instance
  }, 403);
}

export function createNotFoundErrorResponse(resource: string, instance?: string): NextResponse {
  return createProblemResponse({
    type: 'https://docs.fixzit.com/errors/not-found',
    title: 'Resource Not Found',
    status: 404,
    detail: `The requested ${resource} could not be found`,
    instance
  }, 404);
}

export function createConflictErrorResponse(message: string, instance?: string): NextResponse {
  return createProblemResponse({
    type: 'https://docs.fixzit.com/errors/conflict',
    title: 'Conflict',
    status: 409,
    detail: message,
    instance
  }, 409);
}

export function createServerErrorResponse(
  message: string = 'An internal server error occurred',
  instance?: string,
  traceId?: string
): NextResponse {
  return createProblemResponse({
    type: 'https://docs.fixzit.com/errors/server',
    title: 'Internal Server Error',
    status: 500,
    detail: message,
    instance,
    traceId
  }, 500);
}

export function createRateLimitErrorResponse(
  retryAfter?: number,
  instance?: string
): NextResponse {
  const response = createProblemResponse({
    type: 'https://docs.fixzit.com/errors/rate-limit',
    title: 'Rate Limit Exceeded',
    status: 429,
    detail: 'Too many requests. Please try again later.',
    instance
  }, 429);

  if (retryAfter) {
    response.headers.set('Retry-After', retryAfter.toString());
  }

  return response;
}

// Helper to extract error details from various error types
export function extractErrorDetails(error: any): {
  code: string;
  message: string;
  status: number;
  details?: any;
} {
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      status: 500,
      details: { stack: error.stack }
    };
  }

  if (typeof error === 'string') {
    return {
      code: 'UNKNOWN_ERROR',
      message: error,
      status: 500
    };
  }

  if (error && typeof error === 'object') {
    return {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An error occurred',
      status: error.status || 500,
      details: error.details
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    status: 500
  };
}