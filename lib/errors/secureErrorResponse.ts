import { NextRequest, NextResponse } from 'next/server';
import { createSecureResponse } from '@/server/security/headers';

/**
 * Enhanced error response with security headers and consistent formatting
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
  timestamp?: string;
}

/**
 * Creates a secure error response with proper status code and security headers
 * @param message - Error message to return
 * @param statusCode - HTTP status code (default: 500)
 * @param request - Optional NextRequest for CORS handling
 * @param code - Optional error code for client identification
 * @param details - Optional additional error details
 * @returns NextResponse with secure headers
 */
export function createErrorResponse(
  message: string,
  statusCode: number = 500,
  request?: NextRequest,
  code?: string,
  details?: unknown
): NextResponse {
  const errorResponse: ErrorResponse = {
    error: message,
    timestamp: new Date().toISOString()
  };

  if (code) {
    errorResponse.code = code;
  }

  if (details) {
    errorResponse.details = details;
  }

  return createSecureResponse(errorResponse, statusCode, request);
}

/**
 * Common error responses for consistency across the API
 */
export const CommonErrors = {
  UNAUTHORIZED: (request?: NextRequest) => 
    createErrorResponse('Unauthorized access', 401, request, 'UNAUTHORIZED'),
  
  FORBIDDEN: (request?: NextRequest) => 
    createErrorResponse('Forbidden access', 403, request, 'FORBIDDEN'),
  
  NOT_FOUND: (resource?: string, request?: NextRequest) => 
    createErrorResponse(`${resource || 'Resource'} not found`, 404, request, 'NOT_FOUND'),
  
  VALIDATION_ERROR: (message: string, request?: NextRequest, details?: unknown) => 
    createErrorResponse(`Validation error: ${message}`, 400, request, 'VALIDATION_ERROR', details),
  
  INTERNAL_ERROR: (request?: NextRequest) => 
    createErrorResponse('Internal server error', 500, request, 'INTERNAL_ERROR'),
  
  RATE_LIMIT_EXCEEDED: (request?: NextRequest) => 
    createErrorResponse('Rate limit exceeded', 429, request, 'RATE_LIMIT_EXCEEDED'),
  
  SERVICE_UNAVAILABLE: (request?: NextRequest) => 
    createErrorResponse('Service temporarily unavailable', 503, request, 'SERVICE_UNAVAILABLE')
};

export default createErrorResponse;