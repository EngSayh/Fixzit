/**
 * API Error Handling Tests
 * Tests standardized error responses, status codes, and error recovery
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('API Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Standardized Error Response Format', () => {
    interface APIError {
      success: false;
      error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
        timestamp: string;
        requestId?: string;
      };
    }

    const createErrorResponse = (
      code: string,
      message: string,
      details?: Record<string, unknown>,
      requestId?: string
    ): APIError => {
      return {
        success: false,
        error: {
          code,
          message,
          details,
          timestamp: new Date().toISOString(),
          requestId,
        },
      };
    };

    it('should include all required error fields', () => {
      const error = createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid input data',
        { field: 'email', reason: 'Invalid format' },
        'req-123456'
      );

      expect(error.success).toBe(false);
      expect(error.error.code).toBe('VALIDATION_ERROR');
      expect(error.error.message).toBe('Invalid input data');
      expect(error.error.details?.field).toBe('email');
      expect(error.error.timestamp).toBeDefined();
      expect(error.error.requestId).toBe('req-123456');
    });

    it('should work without optional fields', () => {
      const error = createErrorResponse('NOT_FOUND', 'Resource not found');

      expect(error.error.code).toBe('NOT_FOUND');
      expect(error.error.details).toBeUndefined();
      expect(error.error.requestId).toBeUndefined();
    });
  });

  describe('HTTP Status Code Mapping', () => {
    const errorCodeToStatus: Record<string, number> = {
      VALIDATION_ERROR: 400,
      INVALID_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      METHOD_NOT_ALLOWED: 405,
      CONFLICT: 409,
      RATE_LIMITED: 429,
      INTERNAL_ERROR: 500,
      SERVICE_UNAVAILABLE: 503,
    };

    const getStatusFromErrorCode = (code: string): number => {
      return errorCodeToStatus[code] || 500;
    };

    it.each([
      ['VALIDATION_ERROR', 400],
      ['UNAUTHORIZED', 401],
      ['FORBIDDEN', 403],
      ['NOT_FOUND', 404],
      ['RATE_LIMITED', 429],
      ['INTERNAL_ERROR', 500],
    ])('should map %s to status %d', (code, expectedStatus) => {
      expect(getStatusFromErrorCode(code)).toBe(expectedStatus);
    });

    it('should default to 500 for unknown error codes', () => {
      expect(getStatusFromErrorCode('UNKNOWN_ERROR')).toBe(500);
    });
  });

  describe('Validation Error Details', () => {
    interface FieldError {
      field: string;
      message: string;
      value?: unknown;
      constraint?: string;
    }

    interface ValidationErrorResponse {
      success: false;
      error: {
        code: 'VALIDATION_ERROR';
        message: string;
        fields: FieldError[];
      };
    }

    const createValidationError = (fields: FieldError[]): ValidationErrorResponse => {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `${fields.length} validation error(s)`,
          fields,
        },
      };
    };

    it('should include all field errors', () => {
      const errors = createValidationError([
        { field: 'email', message: 'Invalid email format', value: 'not-an-email' },
        { field: 'age', message: 'Must be positive number', value: -5 },
        { field: 'password', message: 'Too short', constraint: 'minLength: 8' },
      ]);

      expect(errors.error.fields).toHaveLength(3);
      expect(errors.error.message).toBe('3 validation error(s)');
      expect(errors.error.fields[0].field).toBe('email');
      expect(errors.error.fields[2].constraint).toBe('minLength: 8');
    });
  });

  describe('Error Recovery Suggestions', () => {
    interface RecoverableError {
      code: string;
      message: string;
      recoveryHint?: string;
      retryAfter?: number;
      alternatives?: string[];
    }

    const getRecoveryInfo = (code: string): RecoverableError => {
      const recoveryMap: Record<string, Omit<RecoverableError, 'code' | 'message'>> = {
        RATE_LIMITED: {
          recoveryHint: 'Wait before retrying the request',
          retryAfter: 60,
        },
        SESSION_EXPIRED: {
          recoveryHint: 'Please log in again',
          alternatives: ['/login', '/refresh-token'],
        },
        RESOURCE_LOCKED: {
          recoveryHint: 'The resource is being edited by another user',
          retryAfter: 30,
        },
        PAYMENT_FAILED: {
          recoveryHint: 'Please verify your payment method',
          alternatives: ['/settings/payment', '/support'],
        },
      };

      const recovery = recoveryMap[code] || {};
      return {
        code,
        message: 'An error occurred',
        ...recovery,
      };
    };

    it('should provide retry-after for rate limit errors', () => {
      const error = getRecoveryInfo('RATE_LIMITED');
      expect(error.retryAfter).toBe(60);
      expect(error.recoveryHint).toContain('Wait');
    });

    it('should provide alternatives for session errors', () => {
      const error = getRecoveryInfo('SESSION_EXPIRED');
      expect(error.alternatives).toContain('/login');
    });

    it('should handle unknown errors gracefully', () => {
      const error = getRecoveryInfo('UNKNOWN');
      expect(error.code).toBe('UNKNOWN');
      expect(error.recoveryHint).toBeUndefined();
    });
  });

  describe('Sensitive Data Filtering in Errors', () => {
    const sanitizeErrorDetails = (details: Record<string, unknown>): Record<string, unknown> => {
      const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'ssn'];
      const sanitized: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(details)) {
        const iseSensitive = sensitiveFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase())
        );
        
        if (iseSensitive) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = sanitizeErrorDetails(value as Record<string, unknown>);
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    };

    it('should redact sensitive fields', () => {
      const details = {
        email: 'test@example.com',
        password: 'secret123',
        apiKey: 'sk-abc123',
      };

      const sanitized = sanitizeErrorDetails(details);

      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
    });

    it('should handle nested objects', () => {
      const details = {
        user: {
          name: 'John',
          authToken: 'xyz789',
        },
        request: {
          url: '/api/test',
          secretHeader: 'bearer abc',
        },
      };

      const sanitized = sanitizeErrorDetails(details);

      expect((sanitized.user as Record<string, unknown>).name).toBe('John');
      expect((sanitized.user as Record<string, unknown>).authToken).toBe('[REDACTED]');
      expect((sanitized.request as Record<string, unknown>).secretHeader).toBe('[REDACTED]');
    });
  });

  describe('Error Logging Integration', () => {
    interface ErrorLogEntry {
      level: 'error' | 'warn' | 'info';
      code: string;
      message: string;
      stack?: string;
      context?: Record<string, unknown>;
      timestamp: Date;
    }

    const logs: ErrorLogEntry[] = [];

    const logError = (
      code: string,
      message: string,
      options?: { stack?: string; context?: Record<string, unknown>; level?: 'error' | 'warn' }
    ): void => {
      logs.push({
        level: options?.level || 'error',
        code,
        message,
        stack: options?.stack,
        context: options?.context,
        timestamp: new Date(),
      });
    };

    beforeEach(() => {
      logs.length = 0;
    });

    it('should log errors with full context', () => {
      logError('DATABASE_ERROR', 'Connection failed', {
        context: { host: 'db.example.com', port: 27017 },
        stack: 'Error: Connection failed\n    at connect...',
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].code).toBe('DATABASE_ERROR');
      expect(logs[0].context?.host).toBe('db.example.com');
      expect(logs[0].stack).toContain('Connection failed');
    });

    it('should allow warning level for non-critical errors', () => {
      logError('DEPRECATION_WARNING', 'This API will be removed', {
        level: 'warn',
      });

      expect(logs[0].level).toBe('warn');
    });
  });

  describe('Async Error Boundaries', () => {
    const asyncOperation = async (shouldFail: boolean): Promise<{ data: string }> => {
      if (shouldFail) {
        throw new Error('Async operation failed');
      }
      return { data: 'success' };
    };

    const safeAsyncWrapper = async <T>(
      operation: () => Promise<T>
    ): Promise<{ success: true; data: T } | { success: false; error: string }> => {
      try {
        const data = await operation();
        return { success: true, data };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    };

    it('should wrap successful async operations', async () => {
      const result = await safeAsyncWrapper(() => asyncOperation(false));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data).toBe('success');
      }
    });

    it('should catch and format async errors', async () => {
      const result = await safeAsyncWrapper(() => asyncOperation(true));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Async operation failed');
      }
    });
  });

  describe('Pagination Error Handling', () => {
    interface PaginationError {
      code: 'INVALID_PAGINATION';
      message: string;
      invalidParams: Array<{ param: string; value: unknown; reason: string }>;
    }

    const validatePagination = (
      page?: number,
      limit?: number,
      cursor?: string
    ): PaginationError | null => {
      const errors: Array<{ param: string; value: unknown; reason: string }> = [];

      if (page !== undefined && page < 1) {
        errors.push({ param: 'page', value: page, reason: 'Must be >= 1' });
      }

      if (limit !== undefined) {
        if (limit < 1) {
          errors.push({ param: 'limit', value: limit, reason: 'Must be >= 1' });
        } else if (limit > 100) {
          errors.push({ param: 'limit', value: limit, reason: 'Max limit is 100' });
        }
      }

      if (cursor !== undefined && !/^[a-zA-Z0-9+/=]+$/.test(cursor)) {
        errors.push({ param: 'cursor', value: cursor, reason: 'Invalid cursor format' });
      }

      if (errors.length > 0) {
        return {
          code: 'INVALID_PAGINATION',
          message: 'Invalid pagination parameters',
          invalidParams: errors,
        };
      }

      return null;
    };

    it('should validate page number', () => {
      const error = validatePagination(0);
      expect(error?.invalidParams[0].param).toBe('page');
      expect(error?.invalidParams[0].reason).toContain('>= 1');
    });

    it('should validate limit bounds', () => {
      const error = validatePagination(1, 500);
      expect(error?.invalidParams[0].param).toBe('limit');
      expect(error?.invalidParams[0].reason).toContain('100');
    });

    it('should validate cursor format', () => {
      const error = validatePagination(1, 10, 'invalid<cursor>');
      expect(error?.invalidParams[0].param).toBe('cursor');
    });

    it('should return null for valid pagination', () => {
      const error = validatePagination(1, 25, 'YWJjMTIz');
      expect(error).toBeNull();
    });
  });

  describe('Batch Operation Errors', () => {
    interface BatchResult<T> {
      successful: Array<{ id: string; data: T }>;
      failed: Array<{ id: string; error: string }>;
      summary: {
        total: number;
        succeeded: number;
        failed: number;
      };
    }

    const processBatch = async <T>(
      items: Array<{ id: string; data: T }>,
      processor: (item: T) => Promise<T>
    ): Promise<BatchResult<T>> => {
      const results: BatchResult<T> = {
        successful: [],
        failed: [],
        summary: { total: items.length, succeeded: 0, failed: 0 },
      };

      for (const item of items) {
        try {
          const processed = await processor(item.data);
          results.successful.push({ id: item.id, data: processed });
          results.summary.succeeded++;
        } catch (error) {
          results.failed.push({
            id: item.id,
            error: error instanceof Error ? error.message : 'Processing failed',
          });
          results.summary.failed++;
        }
      }

      return results;
    };

    it('should track successful and failed items separately', async () => {
      const items = [
        { id: '1', data: { value: 1 } },
        { id: '2', data: { value: 2 } },
        { id: '3', data: { value: 3 } },
      ];

      const processor = async (item: { value: number }) => {
        if (item.value === 2) throw new Error('Invalid value');
        return item;
      };

      const result = await processBatch(items, processor);

      expect(result.summary.succeeded).toBe(2);
      expect(result.summary.failed).toBe(1);
      expect(result.failed[0].id).toBe('2');
      expect(result.failed[0].error).toBe('Invalid value');
    });

    it('should handle all items failing', async () => {
      const items = [
        { id: '1', data: {} },
        { id: '2', data: {} },
      ];

      const processor = async () => {
        throw new Error('Always fails');
      };

      const result = await processBatch(items, processor);

      expect(result.summary.succeeded).toBe(0);
      expect(result.summary.failed).toBe(2);
    });
  });
});
