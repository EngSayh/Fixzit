import { NextRequest, NextResponse } from 'next/server';
import { 
  createProblemResponse, 
  createValidationErrorResponse, 
  createServerErrorResponse,
  extractErrorDetails 
} from './problemDetails';
import { z } from 'zod';

export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('API Error:', error);

      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        return createValidationErrorResponse(
          error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          })),
          args[0]?.url
        );
      }

      // Handle other known error types
      const errorDetails = extractErrorDetails(error);
      
      // Map common error patterns to specific problem types
      if (errorDetails.message.includes('not found')) {
        return createProblemResponse({
          type: 'https://docs.fixzit.com/errors/not-found',
          title: 'Resource Not Found',
          status: 404,
          detail: errorDetails.message,
          instance: args[0]?.url
        }, 404);
      }

      if (errorDetails.message.includes('permission') || errorDetails.message.includes('unauthorized')) {
        return createProblemResponse({
          type: 'https://docs.fixzit.com/errors/authorization',
          title: 'Access Denied',
          status: 403,
          detail: errorDetails.message,
          instance: args[0]?.url
        }, 403);
      }

      if (errorDetails.message.includes('validation') || errorDetails.message.includes('invalid')) {
        return createProblemResponse({
          type: 'https://docs.fixzit.com/errors/validation',
          title: 'Validation Error',
          status: 422,
          detail: errorDetails.message,
          instance: args[0]?.url
        }, 422);
      }

      // Default server error
      return createServerErrorResponse(
        errorDetails.message,
        args[0]?.url,
        `${errorDetails.code}-${Date.now()}`
      );
    }
  };
}

// Decorator for API route handlers
export function apiErrorHandler(handler: (req: NextRequest) => Promise<NextResponse>) {
  return withErrorHandling(handler);
}

// Helper to create consistent error responses
export function createErrorResponse(
  error: any,
  req: NextRequest,
  context?: string
): NextResponse {
  const errorDetails = extractErrorDetails(error);
  const traceId = `${context || 'API'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return createProblemResponse({
    type: `https://docs.fixzit.com/errors/${errorDetails.code.toLowerCase()}`,
    title: errorDetails.message,
    status: errorDetails.status,
    detail: errorDetails.details?.message || errorDetails.message,
    instance: req.url,
    traceId,
    code: errorDetails.code
  }, errorDetails.status);
}