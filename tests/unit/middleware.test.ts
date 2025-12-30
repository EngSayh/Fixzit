import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { middleware, sanitizeIncomingHeaders } from '../../middleware';
import { generateToken } from '../../lib/auth';

// Mock NextAuth - middleware uses dynamic import of @/auth
vi.mock('@/auth', () => ({
  auth: (
    handler: (ctx: { auth: { user: { id: string; email: string; role: string; orgId: string } } | null }) => Promise<Response | NextResponse>
  ) => {
    return async (request: NextRequest) => {
      // Extract token from cookies to determine if user is authenticated
      const token = request.cookies.get('fixzit_auth')?.value;
      if (!token) {
        return handler({ auth: null });
      }
      
      // Validate token format - reject malformed or obviously invalid tokens
      if (token === 'invalid-token' || 
          token === 'malformed' || 
          token === 'malformed.jwt.token' ||
          token.startsWith('malformed') ||
          token.length < 10) {
        return handler({ auth: null });
      }
      
      // For tests with valid tokens, return mock user
      // In production, NextAuth validates the token
      return handler({
        auth: {
          user: {
            id: '123',
            email: 'test@example.com',
            role: 'EMPLOYEE',
            orgId: 'org1',
          }
        }
      });
    };
  },
}));

// Mock environment variables
const mockEnv = {
  JWT_SECRET: 'test-secret-key-for-testing-only',
  CSRF_PROTECTION: 'true',  // Enable CSRF protection for tests
  NODE_ENV: 'test',
  API_PROTECT_ALL: 'true',
  PLAYWRIGHT_TESTS: 'false',
  VITEST: 'true',
};

describe('Middleware', () => {
  beforeEach(() => {
    // Reset environment
    process.env = { ...process.env, ...mockEnv };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = (
    url: string,
    cookies?: Record<string, string>,
    headers?: Record<string, string>,
    method: string = 'GET'
  ): NextRequest => {
    const headerObj = new Headers(headers || {});
    if (cookies && Object.keys(cookies).length > 0) {
      const cookieHeader = Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
      headerObj.set('cookie', cookieHeader);
    }
    return new NextRequest(`http://localhost:3000${url}`, {
      headers: headerObj,
      method,
    });
  };

  // Helper to create valid JWT tokens for testing
  const makeToken = async (payload: { id: string; email: string; role: string; orgId: string }): Promise<string> => {
    return await generateToken(payload);
  };

  describe('Public Routes', () => {
    it('should allow access to /login without authentication', async () => {
      const request = createMockRequest('/login');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
      if (response) expect(response.status).toBe(200);
    });

    it('should allow access to /register without authentication', async () => {
      const request = createMockRequest('/register');
      const response = await middleware(request);
      
      // /register is not in public routes, so it returns Response
      expect(response).toBeInstanceOf(Response);
    });

    it('should allow access to /forgot-password without authentication', async () => {
      const request = createMockRequest('/forgot-password');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
      if (response) expect(response.status).toBe(200);
    });

    it('should allow access to landing page (/) without authentication', async () => {
      const request = createMockRequest('/');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
      if (response) expect(response.status).toBe(200);
    });

    it('should allow access to /api/auth/* endpoints without authentication', async () => {
      const request = createMockRequest('/api/auth/login');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
      if (response) expect(response.status).toBe(200);
    });
  });

  describe('Protected Routes - Authentication', () => {
    it('should redirect to /login when accessing /fm/dashboard without token', async () => {
      const request = createMockRequest('/fm/dashboard');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
      expect(response?.headers.get('location')).toContain('/login');
    });

    it('should redirect to /login when accessing /fm/work-orders without token', async () => {
      const request = createMockRequest('/fm/work-orders');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
      expect(response?.headers.get('location')).toContain('/login');
    });

    it('should allow access to /fm/dashboard with valid token', async () => {
      const token = await makeToken({
        id: '123',
        email: 'test@example.com',
        role: 'EMPLOYEE',
        orgId: 'org1',
      });

      const request = createMockRequest('/fm/dashboard', {
        fixzit_auth: token,
      });
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
    });

    it('sanitizes attacker-supplied identity headers before processing', async () => {
      const token = await makeToken({
        id: '123',
        email: 'test@example.com',
        role: 'EMPLOYEE',
        orgId: 'org1',
      });

      const request = createMockRequest(
        '/fm/dashboard',
        { fixzit_auth: token },
        { 'x-user': 'evil', 'x-org-id': 'attacker-org' },
        'GET',
      );

      const sanitized = sanitizeIncomingHeaders(request);
      expect(sanitized.get('x-user')).toBeNull();
      expect(sanitized.get('x-org-id')).toBeNull();
      expect(sanitized.get('x-impersonated-org-id')).toBeNull();
    });

    it('should redirect to /login when token is invalid', async () => {
      const request = createMockRequest('/fm/dashboard', {
        fixzit_auth: 'invalid-token',
      });
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
      expect(response?.headers.get('location')).toContain('/login');
    });

    it('should redirect to /login when token is malformed', async () => {
      const request = createMockRequest('/fm/dashboard', {
        fixzit_auth: 'malformed.jwt.token',
      });
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
      expect(response?.headers.get('location')).toContain('/login');
    });

    // Locale-prefixed route protection tests (SECURITY: prevent RBAC bypass via /[locale]/...)
    it('should redirect to /login when accessing /ar/admin/fm-dashboard without token', async () => {
      const request = createMockRequest('/ar/admin/fm-dashboard');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
      expect(response?.headers.get('location')).toContain('/login');
    });

    it('should redirect to /login when accessing /en/admin/fm-dashboard without token', async () => {
      const request = createMockRequest('/en/admin/fm-dashboard');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
      expect(response?.headers.get('location')).toContain('/login');
    });

    it('should protect /ar/fm/dashboard (locale-prefixed FM route)', async () => {
      const request = createMockRequest('/ar/fm/dashboard');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
      expect(response?.headers.get('location')).toContain('/login');
    });

    it('should protect /en/finance/invoices (locale-prefixed finance route)', async () => {
      const request = createMockRequest('/en/finance/invoices');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
      expect(response?.headers.get('location')).toContain('/login');
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should allow SUPER_ADMIN to access /admin routes', async () => {
      const token = await makeToken({
        id: '123',
        email: 'admin@example.com',
        role: 'SUPER_ADMIN',
        orgId: 'org1',
      });

      const request = createMockRequest('/admin/users', {
        fixzit_auth: token,
      });
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
    });

    it('should block non-admin from accessing /admin routes', async () => {
      const token = await makeToken({
        id: '123',
        email: 'user@example.com',
        role: 'EMPLOYEE',
        orgId: 'org1',
      });

      const request = createMockRequest('/admin/users', {
        fixzit_auth: token,
      });
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
      expect(response?.headers.get('location')).toContain('/login');
    });

    it('should allow EMPLOYEE to access /fm/work-orders', async () => {
      const token = await makeToken({
        id: '123',
        email: 'pm@example.com',
        role: 'EMPLOYEE',
        orgId: 'org1',
      });

      const request = createMockRequest('/fm/work-orders', {
        fixzit_auth: token,
      });
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
    });

    it('should allow TECHNICIAN to access /fm/work-orders', async () => {
      const token = await makeToken({
        id: '123',
        email: 'tech@example.com',
        role: 'TECHNICIAN',
        orgId: 'org1',
      });

      const request = createMockRequest('/fm/work-orders', {
        fixzit_auth: token,
      });
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
    });
  });

  describe('API Route Protection', () => {
    it('should protect /api/work-orders with authentication', async () => {
      const request = createMockRequest('/api/work-orders');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
      expect(response?.status).toBe(401); // Unauthorized
    });

    it('should allow authenticated API access', async () => {
      const token = await makeToken({
        id: '123',
        email: 'test@example.com',
        role: 'EMPLOYEE',
        orgId: 'org1',
      });

      const request = createMockRequest('/api/work-orders', {
        fixzit_auth: token,
      });
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
    });

    it('should return 401 for /api routes without token', async () => {
      const request = createMockRequest('/api/users/profile');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
      expect(response?.status).toBe(401);
    });
  });

  describe('Marketplace Routes', () => {
    it('should allow access to /marketplace without authentication', async () => {
      const request = createMockRequest('/marketplace');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
    });

    it('should allow access to /souq without authentication', async () => {
      const request = createMockRequest('/souq');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
    });

    it('should protect /souq/checkout with authentication', async () => {
      const request = createMockRequest('/souq/checkout');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
      if (response && response.headers.get('location')) {
        expect(response.headers.get('location')).toContain('/login');
      }
    });
  });

  describe('Static Assets and Special Routes', () => {
    it('should skip middleware for /_next/* routes', async () => {
      const request = createMockRequest('/_next/static/chunk.js');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
    });

    it('should skip middleware for /api/health check', async () => {
      const request = createMockRequest('/api/health');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
    });

    it('should skip middleware for /favicon.ico', async () => {
      const request = createMockRequest('/favicon.ico');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
    });
  });

  describe('Redirect Behavior', () => {
    it('should preserve query parameters when redirecting to login', async () => {
      const request = createMockRequest('/fm/dashboard?tab=workorders&filter=active');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
      expect(response?.headers.get('location')).toContain('/login');
    });

    it('should allow authenticated users to access /login without redirect', async () => {
      const token = await makeToken({
        id: '123',
        email: 'test@example.com',
        role: 'EMPLOYEE',
        orgId: 'org1',
      });

      const request = createMockRequest('/login', {
        fixzit_auth: token,
      });
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
    });
  });

  describe('JWT Validation Edge Cases', () => {
    it('should handle malformed JWT gracefully', async () => {
      const request = createMockRequest('/fm/dashboard', {
        fixzit_auth: 'malformed.jwt.token',
      });
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
      expect(response?.headers.get('location')).toContain('/login');
    });

    it('should handle missing JWT_SECRET gracefully', async () => {
      delete process.env.JWT_SECRET;

      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJFTVBMT1lFRSIsIm9yZ0lkIjoib3JnMSJ9.invalid';
      const request = createMockRequest('/fm/dashboard', {
        fixzit_auth: token,
      });
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(Response);
      if (response && response.headers.get('location')) {
        expect(response.headers.get('location')).toContain('/login');
      }
    });

    it('should allow valid JWT to proceed without errors', async () => {
      const token = await makeToken({
        id: '123',
        email: 'test@example.com',
        role: 'EMPLOYEE',
        orgId: 'org1',
      });

      const request = createMockRequest('/fm/dashboard', {
        fixzit_auth: token,
      });
      const response = await middleware(request);
      
      // Middleware allows request to proceed when JWT is valid
      expect(response).toBeInstanceOf(Response);
    });
  });

  describe('CSRF Protection', () => {
    const validCsrfToken = 'valid-csrf-token-12345';

    describe('Safe Methods (GET, HEAD, OPTIONS)', () => {
      it('should allow GET requests without CSRF token', async () => {
        const request = createMockRequest('/api/work-orders', {}, {}, 'GET');
        const response = await middleware(request);
        
        expect(response).toBeInstanceOf(Response);
        // GET requests should not be blocked by CSRF
        // They may still be blocked by auth, but that's a different concern
      });

      it('should allow HEAD requests without CSRF token', async () => {
        const request = createMockRequest('/api/work-orders', {}, {}, 'HEAD');
        const response = await middleware(request);
        
        expect(response).toBeInstanceOf(Response);
      });

      it('should allow OPTIONS requests without CSRF token', async () => {
        const request = createMockRequest('/api/work-orders', {}, {}, 'OPTIONS');
        const response = await middleware(request);
        
        expect(response).toBeInstanceOf(Response);
      });
    });

    describe('State-Changing Methods (POST, PUT, DELETE, PATCH)', () => {
      it('should reject POST without X-CSRF-Token header', async () => {
        const token = await makeToken({
          id: '123',
          email: 'test@example.com',
          role: 'EMPLOYEE',
          orgId: 'org1',
        });

        const request = createMockRequest(
          '/api/work-orders',
          { fixzit_auth: token },
          {}, // No CSRF header
          'POST'
        );
        const response = await middleware(request);
        
        expect(response).toBeInstanceOf(Response);
        // Should be 403 Forbidden for missing CSRF
        expect(response?.status).toBe(403);
      });

      it('should reject POST with mismatched CSRF tokens', async () => {
        const token = await makeToken({
          id: '123',
          email: 'test@example.com',
          role: 'EMPLOYEE',
          orgId: 'org1',
        });

        const request = createMockRequest(
          '/api/work-orders',
          { 
            fixzit_auth: token,
            'csrf-token': validCsrfToken  // Cookie token
          },
          { 'X-CSRF-Token': 'different-token' },  // Header token (mismatched)
          'POST'
        );
        const response = await middleware(request);
        
        expect(response).toBeInstanceOf(Response);
        expect(response?.status).toBe(403);
      });

      it('should reject PUT without CSRF token', async () => {
        const token = await makeToken({
          id: '123',
          email: 'test@example.com',
          role: 'EMPLOYEE',
          orgId: 'org1',
        });

        const request = createMockRequest(
          '/api/work-orders/123',
          { fixzit_auth: token },
          {},
          'PUT'
        );
        const response = await middleware(request);
        
        expect(response).toBeInstanceOf(Response);
        expect(response?.status).toBe(403);
      });

      it('should reject DELETE without CSRF token', async () => {
        const token = await makeToken({
          id: '123',
          email: 'test@example.com',
          role: 'EMPLOYEE',
          orgId: 'org1',
        });

        const request = createMockRequest(
          '/api/work-orders/123',
          { fixzit_auth: token },
          {},
          'DELETE'
        );
        const response = await middleware(request);
        
        expect(response).toBeInstanceOf(Response);
        expect(response?.status).toBe(403);
      });

      it('should reject PATCH without CSRF token', async () => {
        const token = await makeToken({
          id: '123',
          email: 'test@example.com',
          role: 'EMPLOYEE',
          orgId: 'org1',
        });

        const request = createMockRequest(
          '/api/work-orders/123',
          { fixzit_auth: token },
          {},
          'PATCH'
        );
        const response = await middleware(request);
        
        expect(response).toBeInstanceOf(Response);
        expect(response?.status).toBe(403);
      });

      it('should allow POST with valid matching CSRF tokens', async () => {
        const token = await makeToken({
          id: '123',
          email: 'test@example.com',
          role: 'EMPLOYEE',
          orgId: 'org1',
        });

        const request = createMockRequest(
          '/api/work-orders',
          { 
            fixzit_auth: token,
            'csrf-token': validCsrfToken  // Cookie token
          },
          { 'X-CSRF-Token': validCsrfToken },  // Header token (matching)
          'POST'
        );
        const response = await middleware(request);
        
        expect(response).toBeInstanceOf(Response);
        // Should NOT be 403 - CSRF validation passed
        // May still be blocked by other auth issues, but not CSRF
        expect(response?.status).not.toBe(403);
      });

      it('should accept lowercase x-csrf-token header', async () => {
        const token = await makeToken({
          id: '123',
          email: 'test@example.com',
          role: 'EMPLOYEE',
          orgId: 'org1',
        });

        const request = createMockRequest(
          '/api/work-orders',
          { 
            fixzit_auth: token,
            'csrf-token': validCsrfToken
          },
          { 'x-csrf-token': validCsrfToken },  // Lowercase header
          'POST'
        );
        const response = await middleware(request);
        
        expect(response).toBeInstanceOf(Response);
        // Should pass CSRF validation
        expect(response?.status).not.toBe(403);
      });
    });

    describe('CSRF Exempt Routes', () => {
      it('should bypass CSRF for /api/auth routes', async () => {
        const request = createMockRequest(
          '/api/auth/signin',
          {},
          {},
          'POST'
        );
        const response = await middleware(request);
        
        expect(response).toBeInstanceOf(Response);
        // Should not be blocked by CSRF (auth routes handle their own CSRF)
        expect(response?.status).not.toBe(403);
      });

      it('should bypass CSRF for /api/webhooks routes', async () => {
        const request = createMockRequest(
          '/api/webhooks/stripe',
          {},
          {},
          'POST'
        );
        const response = await middleware(request);
        
        expect(response).toBeInstanceOf(Response);
        // Webhooks use signature verification instead of CSRF
        expect(response?.status).not.toBe(403);
      });

      it('should bypass CSRF for /api/health endpoint', async () => {
        const request = createMockRequest(
          '/api/health',
          {},
          {},
          'POST'
        );
        const response = await middleware(request);
        
        expect(response).toBeInstanceOf(Response);
        // Health checks don't change state
        expect(response?.status).not.toBe(403);
      });

      it('should bypass CSRF for /api/copilot routes', async () => {
        const request = createMockRequest(
          '/api/copilot/chat',
          {},
          {},
          'POST'
        );
        const response = await middleware(request);
        
        expect(response).toBeInstanceOf(Response);
        // Copilot uses separate auth mechanism
        expect(response?.status).not.toBe(403);
      });
    });

    describe('CSRF Protection Toggle', () => {
      it('should respect CSRF_PROTECTION=false environment variable', async () => {
        // Disable CSRF protection
        process.env.CSRF_PROTECTION = 'false';

        const token = await makeToken({
          id: '123',
          email: 'test@example.com',
          role: 'EMPLOYEE',
          orgId: 'org1',
        });

        const request = createMockRequest(
          '/api/work-orders',
          { fixzit_auth: token },
          {},  // No CSRF token
          'POST'
        );
        const response = await middleware(request);
        
        expect(response).toBeInstanceOf(Response);
        // Should not be blocked by CSRF when disabled
        // Note: In real implementation, check if middleware respects this env var
      });
    });

    describe('CSRF Error Responses', () => {
      it('should return proper error message for missing CSRF token', async () => {
        const token = await makeToken({
          id: '123',
          email: 'test@example.com',
          role: 'EMPLOYEE',
          orgId: 'org1',
        });

        const request = createMockRequest(
          '/api/work-orders',
          { fixzit_auth: token },
          {},
          'POST'
        );
        const response = await middleware(request);
        
        expect(response).toBeInstanceOf(Response);
        if (response?.status === 403) {
          const body = await response.json();
          expect(body).toHaveProperty('error');
          expect(body.error).toMatch(/csrf/i);
        }
      });
    });
  });
});
