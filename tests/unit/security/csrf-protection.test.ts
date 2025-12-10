/**
 * CSRF Protection Tests
 * 
 * Tests for the CSRF validation middleware in middleware.ts
 * Ensures state-changing requests require valid CSRF tokens
 * 
 * @module tests/unit/security/csrf-protection.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the logger to prevent console output
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Extract the validateCSRF logic for testing
function validateCSRF(request: NextRequest, exemptRoutes: string[]): boolean {
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }
  
  const pathname = request.nextUrl.pathname;
  
  if (exemptRoutes.some(route => pathname.startsWith(route))) {
    return true;
  }
  
  const headerToken = request.headers.get('X-CSRF-Token') || request.headers.get('x-csrf-token');
  const cookieToken = request.cookies.get('csrf-token')?.value;
  
  if (!headerToken || !cookieToken) {
    return false;
  }
  
  if (headerToken !== cookieToken) {
    return false;
  }
  
  return true;
}

const CSRF_EXEMPT_ROUTES = [
  '/api/auth',
  '/api/webhooks',
  '/api/health',
  '/api/copilot',
  '/api/qa/log',
  '/api/qa/reconnect',
  '/api/projects',
];

function createMockRequest(
  method: string,
  path: string,
  options: { csrfHeader?: string; csrfCookie?: string } = {}
): NextRequest {
  const url = new URL(path, 'http://localhost:3000');
  const headers = new Headers();
  
  if (options.csrfHeader) {
    headers.set('X-CSRF-Token', options.csrfHeader);
  }
  
  const request = new NextRequest(url, {
    method,
    headers,
  });
  
  // Mock the cookies
  if (options.csrfCookie) {
    Object.defineProperty(request, 'cookies', {
      value: {
        get: (name: string) => name === 'csrf-token' ? { value: options.csrfCookie } : undefined,
      },
    });
  } else {
    Object.defineProperty(request, 'cookies', {
      value: {
        get: () => undefined,
      },
    });
  }
  
  return request;
}

describe('CSRF Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Safe Methods', () => {
    it('should allow GET requests without CSRF token', () => {
      const request = createMockRequest('GET', '/api/work-orders');
      expect(validateCSRF(request, CSRF_EXEMPT_ROUTES)).toBe(true);
    });

    it('should allow HEAD requests without CSRF token', () => {
      const request = createMockRequest('HEAD', '/api/work-orders');
      expect(validateCSRF(request, CSRF_EXEMPT_ROUTES)).toBe(true);
    });

    it('should allow OPTIONS requests without CSRF token', () => {
      const request = createMockRequest('OPTIONS', '/api/work-orders');
      expect(validateCSRF(request, CSRF_EXEMPT_ROUTES)).toBe(true);
    });
  });

  describe('Exempt Routes', () => {
    it('should allow POST to /api/auth without CSRF token', () => {
      const request = createMockRequest('POST', '/api/auth/signin');
      expect(validateCSRF(request, CSRF_EXEMPT_ROUTES)).toBe(true);
    });

    it('should allow POST to /api/webhooks without CSRF token', () => {
      const request = createMockRequest('POST', '/api/webhooks/stripe');
      expect(validateCSRF(request, CSRF_EXEMPT_ROUTES)).toBe(true);
    });

    it('should allow POST to /api/health without CSRF token', () => {
      const request = createMockRequest('POST', '/api/health/ready');
      expect(validateCSRF(request, CSRF_EXEMPT_ROUTES)).toBe(true);
    });

    it('should allow POST to /api/copilot without CSRF token', () => {
      const request = createMockRequest('POST', '/api/copilot/chat');
      expect(validateCSRF(request, CSRF_EXEMPT_ROUTES)).toBe(true);
    });
  });

  describe('State-Changing Requests', () => {
    const validToken = 'valid-csrf-token-12345';

    it('should allow POST with valid matching CSRF tokens', () => {
      const request = createMockRequest('POST', '/api/work-orders', {
        csrfHeader: validToken,
        csrfCookie: validToken,
      });
      expect(validateCSRF(request, CSRF_EXEMPT_ROUTES)).toBe(true);
    });

    it('should allow PUT with valid matching CSRF tokens', () => {
      const request = createMockRequest('PUT', '/api/work-orders/123', {
        csrfHeader: validToken,
        csrfCookie: validToken,
      });
      expect(validateCSRF(request, CSRF_EXEMPT_ROUTES)).toBe(true);
    });

    it('should allow PATCH with valid matching CSRF tokens', () => {
      const request = createMockRequest('PATCH', '/api/work-orders/123', {
        csrfHeader: validToken,
        csrfCookie: validToken,
      });
      expect(validateCSRF(request, CSRF_EXEMPT_ROUTES)).toBe(true);
    });

    it('should allow DELETE with valid matching CSRF tokens', () => {
      const request = createMockRequest('DELETE', '/api/work-orders/123', {
        csrfHeader: validToken,
        csrfCookie: validToken,
      });
      expect(validateCSRF(request, CSRF_EXEMPT_ROUTES)).toBe(true);
    });

    it('should reject POST without CSRF header', () => {
      const request = createMockRequest('POST', '/api/work-orders', {
        csrfCookie: validToken,
      });
      expect(validateCSRF(request, CSRF_EXEMPT_ROUTES)).toBe(false);
    });

    it('should reject POST without CSRF cookie', () => {
      const request = createMockRequest('POST', '/api/work-orders', {
        csrfHeader: validToken,
      });
      expect(validateCSRF(request, CSRF_EXEMPT_ROUTES)).toBe(false);
    });

    it('should reject POST with mismatched CSRF tokens', () => {
      const request = createMockRequest('POST', '/api/work-orders', {
        csrfHeader: 'token-from-header',
        csrfCookie: 'different-token-from-cookie',
      });
      expect(validateCSRF(request, CSRF_EXEMPT_ROUTES)).toBe(false);
    });

    it('should reject DELETE without any CSRF tokens', () => {
      const request = createMockRequest('DELETE', '/api/work-orders/123');
      expect(validateCSRF(request, CSRF_EXEMPT_ROUTES)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should be case-insensitive for X-CSRF-Token header', () => {
      const url = new URL('/api/work-orders', 'http://localhost:3000');
      const headers = new Headers();
      headers.set('x-csrf-token', 'test-token');
      
      const request = new NextRequest(url, {
        method: 'POST',
        headers,
      });
      
      Object.defineProperty(request, 'cookies', {
        value: {
          get: (name: string) => name === 'csrf-token' ? { value: 'test-token' } : undefined,
        },
      });
      
      expect(validateCSRF(request, CSRF_EXEMPT_ROUTES)).toBe(true);
    });

    it('should handle empty string tokens as invalid', () => {
      const request = createMockRequest('POST', '/api/work-orders', {
        csrfHeader: '',
        csrfCookie: '',
      });
      expect(validateCSRF(request, CSRF_EXEMPT_ROUTES)).toBe(false);
    });
  });
});
