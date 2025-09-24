// src/lib/api/problemResponse.ts - Helpers for RFC 9457 Problem Details responses
import { NextResponse } from 'next/server';
import { ProblemDetails, PROBLEM_CONTENT_TYPE, createProblemDetails } from '@/src/errors/problem';
import { getErrorByCode } from '@/src/errors/registry';

/**
 * Create a Problem Details response
 */
export function problem(details: Partial<ProblemDetails> & { title: string; status: number }): NextResponse {
  const problemDetails = createProblemDetails(details);
  
  return new NextResponse(
    JSON.stringify(problemDetails),
    {
      status: problemDetails.status,
      headers: {
        'Content-Type': PROBLEM_CONTENT_TYPE,
        'X-Content-Type-Options': 'nosniff'
      }
    }
  );
}

/**
 * Create a Problem Details response from an error code
 */
export function problemFromCode(
  code: string, 
  options?: {
    detail?: string;
    errors?: Array<{ path?: string; message: string }>;
    instance?: string;
    correlationId?: string;
  }
): NextResponse {
  const errorInfo = getErrorByCode(code);
  
  return problem({
    type: `https://docs.fixzit.com/errors/${code}`,
    title: errorInfo.title_en, // Default to English, should use user's locale
    status: errorInfo.httpStatus || 500,
    code,
    module: errorInfo.module,
    category: errorInfo.category,
    detail: options?.detail,
    errors: options?.errors,
    instance: options?.instance,
    correlationId: options?.correlationId
  });
}

/**
 * Common error responses
 */
export const ErrorResponses = {
  // 400 Bad Request
  badRequest: (errors?: Array<{ path?: string; message: string }>) => 
    problemFromCode('WO-API-VAL-001', { errors }),
  
  // 401 Unauthorized
  unauthorized: () => 
    problemFromCode('AUTH-SESSION-EXP-001'),
  
  // 403 Forbidden
  forbidden: (resource?: string) => 
    problemFromCode('WO-API-AUTH-003', { 
      detail: resource ? `Access denied to ${resource}` : undefined 
    }),
  
  // 404 Not Found
  notFound: (resource?: string) => 
    problem({
      type: 'https://docs.fixzit.com/errors/not-found',
      title: 'Resource not found',
      status: 404,
      detail: resource ? `${resource} not found` : 'The requested resource was not found'
    }),
  
  // 409 Conflict
  conflict: (detail?: string) => 
    problem({
      type: 'https://docs.fixzit.com/errors/conflict',
      title: 'Resource conflict',
      status: 409,
      detail
    }),
  
  // 500 Internal Server Error
  serverError: (code?: string, detail?: string) => 
    problemFromCode(code || 'SYS-DB-CONN-001', { detail }),
  
  // 503 Service Unavailable
  serviceUnavailable: (service?: string) => 
    problem({
      type: 'https://docs.fixzit.com/errors/service-unavailable',
      title: 'Service temporarily unavailable',
      status: 503,
      detail: service ? `${service} is temporarily unavailable` : undefined
    })
};

/**
 * Validation helper
 */
export function validateRequest<T>(
  data: unknown,
  validator: (data: unknown) => T | null,
  errorCode = 'WO-API-VAL-001'
): T | NextResponse {
  try {
    const validated = validator(data);
    if (!validated) {
      return problemFromCode(errorCode, {
        errors: [{ message: 'Invalid request data' }]
      });
    }
    return validated;
  } catch (error: any) {
    return problemFromCode(errorCode, {
      detail: error.message,
      errors: error.errors || [{ message: error.message }]
    });
  }
}
