import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, EdgeAuthenticatedUser, AuthenticationError } from './edge-auth-middleware';
// Rate limiter will be implemented separately - placeholder for now
const rateLimit = async (request: NextRequest, maxRequests: number, windowMs: number): Promise<{ success: boolean; retryAfter?: number }> => {
  // TODO: Implement actual rate limiting logic
  return { success: true };
};

/**
 * Standard API Response Format for all endpoints
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    version: string;
  };
}

/**
 * Request Context passed to all API handlers
 */
export interface ApiContext {
  user: EdgeAuthenticatedUser;
  req: NextRequest;
  params?: Record<string, string>;
  searchParams: URLSearchParams;
  requestId: string;
}

/**
 * API Handler Function Type
 */
export type ApiHandler<T = any> = (ctx: ApiContext) => Promise<T>;

/**
 * API Route Configuration
 */
export interface ApiRouteConfig {
  requireAuth?: boolean;
  requiredPermissions?: string[];
  rateLimit?: {
    requests: number;
    window: number; // milliseconds
  };
  timeout?: number; // milliseconds
  validateSchema?: (data: any) => { valid: boolean; errors?: string[] };
}

/**
 * Centralized API Handler - Unifies authentication, database, error handling, and response formatting
 */
export class ApiHandlerCore {
  private static instance: ApiHandlerCore;
  
  public static getInstance(): ApiHandlerCore {
    if (!ApiHandlerCore.instance) {
      ApiHandlerCore.instance = new ApiHandlerCore();
    }
    return ApiHandlerCore.instance;
  }

  /**
   * Handle API request with standardized pipeline
   */
  public async handleRequest<T>(
    request: NextRequest,
    handler: ApiHandler<T>,
    config: ApiRouteConfig = {},
    params?: Record<string, string>
  ): Promise<NextResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Rate limiting
      if (config.rateLimit) {
        const rateLimitResult = await rateLimit(
          request,
          config.rateLimit.requests,
          config.rateLimit.window
        );
        if (!rateLimitResult.success) {
          return this.createErrorResponse(
            'Rate limit exceeded',
            'RATE_LIMIT_EXCEEDED',
            429,
            requestId,
            rateLimitResult.retryAfter
          );
        }
      }

      // Authentication
      let user: EdgeAuthenticatedUser | null = null;
      if (config.requireAuth !== false) {
        const authResult = await authenticateRequest(request);
        if ('error' in authResult) {
          return this.createErrorResponse(
            authResult.error,
            'AUTHENTICATION_ERROR',
            authResult.statusCode,
            requestId
          );
        }
        user = authResult;
      }

      // Permission check
      if (config.requiredPermissions && user) {
        const hasPermission = this.checkPermissions(user, config.requiredPermissions);
        if (!hasPermission) {
          return this.createErrorResponse(
            'Insufficient permissions',
            'PERMISSION_DENIED',
            403,
            requestId
          );
        }
      }

      // Build context
      const searchParams = new URL(request.url).searchParams;
      const context: ApiContext = {
        user: user!,
        req: request,
        params: params || {},
        searchParams,
        requestId
      };

      // Execute handler with timeout
      const timeoutMs = config.timeout || 30000;
      const handlerPromise = handler(context);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
      });

      const result = await Promise.race([handlerPromise, timeoutPromise]);

      // Return successful response
      return this.createSuccessResponse(result, requestId);

    } catch (error: any) {
      console.error(`API Error [${requestId}]:`, {
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
        duration: Date.now() - startTime
      });

      return this.createErrorResponse(
        this.getErrorMessage(error),
        this.getErrorCode(error),
        this.getErrorStatus(error),
        requestId
      );
    }
  }

  /**
   * Create standardized success response
   */
  private createSuccessResponse<T>(data: T, requestId: string): NextResponse {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '2.0.26'
      }
    };

    return NextResponse.json(response);
  }

  /**
   * Create standardized error response
   */
  private createErrorResponse(
    message: string,
    code: string,
    status: number,
    requestId: string,
    retryAfter?: number
  ): NextResponse {
    const response: ApiResponse = {
      success: false,
      error: {
        message,
        code
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: '2.0.26'
      }
    };

    const headers: Record<string, string> = {};
    if (retryAfter) {
      headers['Retry-After'] = retryAfter.toString();
    }

    return NextResponse.json(response, { status, headers });
  }

  /**
   * Check if user has required permissions
   */
  private checkPermissions(user: EdgeAuthenticatedUser, requiredPermissions: string[]): boolean {
    if (user.roles?.[0]?.name === 'super_admin' || user.permissions.includes('*')) {
      return true;
    }

    return requiredPermissions.some(permission => 
      user.permissions.includes(permission)
    );
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract error message from different error types
   */
  private getErrorMessage(error: any): string {
    if (error.message === 'Request timeout') {
      return 'Request timed out. Please try again.';
    }
    if (error.code === 'P2002') {
      return 'A record with this information already exists.';
    }
    if (error.code === 'P2025') {
      return 'Record not found.';
    }
    if (error.code === 'P2003') {
      return 'Referenced record does not exist.';
    }
    return error.message || 'An unexpected error occurred.';
  }

  /**
   * Get error code from different error types
   */
  private getErrorCode(error: any): string {
    if (error.message === 'Request timeout') return 'TIMEOUT';
    if (error.code?.startsWith('P')) return 'DATABASE_ERROR';
    if (error.name === 'ValidationError') return 'VALIDATION_ERROR';
    return 'INTERNAL_ERROR';
  }

  /**
   * Get HTTP status from different error types
   */
  private getErrorStatus(error: any): number {
    if (error.message === 'Request timeout') return 408;
    if (error.code === 'P2025') return 404;
    if (error.code === 'P2002') return 409;
    if (error.name === 'ValidationError') return 400;
    return 500;
  }
}

// Singleton instance
const apiHandler = ApiHandlerCore.getInstance();

/**
 * Convenience method for GET requests
 */
export const handleGet = <T>(
  handler: ApiHandler<T>,
  config?: ApiRouteConfig
) => {
  return async (request: NextRequest, { params }: { params: Record<string, string> }) => {
    return apiHandler.handleRequest(request, handler, config, params);
  };
};

/**
 * Convenience method for POST requests
 */
export const handlePost = <T>(
  handler: ApiHandler<T>,
  config?: ApiRouteConfig
) => {
  return async (request: NextRequest, { params }: { params: Record<string, string> }) => {
    return apiHandler.handleRequest(request, handler, config, params);
  };
};

/**
 * Convenience method for PUT requests
 */
export const handlePut = <T>(
  handler: ApiHandler<T>,
  config?: ApiRouteConfig
) => {
  return async (request: NextRequest, { params }: { params: Record<string, string> }) => {
    return apiHandler.handleRequest(request, handler, config, params);
  };
};

/**
 * Convenience method for DELETE requests
 */
export const handleDelete = <T>(
  handler: ApiHandler<T>,
  config?: ApiRouteConfig
) => {
  return async (request: NextRequest, { params }: { params: Record<string, string> }) => {
    return apiHandler.handleRequest(request, handler, config, params);
  };
};

/**
 * Utility function to parse request body with validation
 */
export const parseRequestBody = async <T>(
  request: NextRequest,
  validator?: (data: any) => { valid: boolean; errors?: string[] }
): Promise<T> => {
  try {
    const body = await request.json();
    
    if (validator) {
      const validation = validator(body);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
      }
    }
    
    return body;
  } catch (error: any) {
    throw new Error(`Invalid request body: ${error.message}`);
  }
};

/**
 * Utility function for pagination parameters
 */
export const getPaginationParams = (searchParams: URLSearchParams) => {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Utility function to build where clause from search parameters
 */
export const buildSearchFilter = (
  searchParams: URLSearchParams,
  searchableFields: string[]
): any => {
  const search = searchParams.get('search');
  if (!search || searchableFields.length === 0) return {};

  return {
    OR: searchableFields.map(field => ({
      [field]: { contains: search, mode: 'insensitive' }
    }))
  };
};

/**
 * Utility function to add pagination metadata to response
 */
export const addPaginationToResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): { data: T[]; pagination: ApiResponse['pagination'] } => {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

export default apiHandler;