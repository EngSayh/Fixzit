import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '../../middleware';

// Mock JWT verification
vi.mock('jsonwebtoken', () => ({
  verify: vi.fn(),
  decode: vi.fn(),
}));

// Mock environment variables
const mockEnv = {
  JWT_SECRET: 'test-secret-key-for-testing-only',
};

describe('Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    process.env = { ...process.env, ...mockEnv };
  });

  const createMockRequest = (
    url: string,
    cookies?: Record<string, string>,
    headers?: Record<string, string>
  ): NextRequest => {
    const request = {
      url: `http://localhost:3000${url}`,
      nextUrl: new URL(`http://localhost:3000${url}`),
      cookies: {
        get: (name: string) => cookies?.[name] ? { value: cookies[name] } : undefined,
        has: (name: string) => !!cookies?.[name],
      },
      headers: new Headers(headers || {}),
    } as unknown as NextRequest;
    return request;
  };

  describe('Public Routes', () => {
    it('should allow access to /login without authentication', async () => {
      const request = createMockRequest('/login');
      const response = await middleware(request);
      
      expect(response).toBeUndefined(); // Middleware returns undefined for allowed requests
    });

    it('should allow access to /register without authentication', async () => {
      const request = createMockRequest('/register');
      const response = await middleware(request);
      
      expect(response).toBeUndefined();
    });

    it('should allow access to /forgot-password without authentication', async () => {
      const request = createMockRequest('/forgot-password');
      const response = await middleware(request);
      
      expect(response).toBeUndefined();
    });

    it('should allow access to landing page (/) without authentication', async () => {
      const request = createMockRequest('/');
      const response = await middleware(request);
      
      expect(response).toBeUndefined();
    });

    it('should allow access to /api/auth/* endpoints without authentication', async () => {
      const request = createMockRequest('/api/auth/login');
      const response = await middleware(request);
      
      expect(response).toBeUndefined();
    });
  });

  describe('Protected Routes - Authentication', () => {
    it('should redirect to /login when accessing /dashboard without token', async () => {
      const request = createMockRequest('/dashboard');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.headers.get('location')).toContain('/login');
    });

    it('should redirect to /login when accessing /workorders without token', async () => {
      const request = createMockRequest('/workorders');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.headers.get('location')).toContain('/login');
    });

    it('should allow access to /dashboard with valid token', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({
        userId: '123',
        email: 'test@example.com',
        role: 'user',
      });

      const request = createMockRequest('/dashboard', {
        'auth-token': 'valid-jwt-token',
      });
      const response = await middleware(request);
      
      expect(response).toBeUndefined();
    });

    it('should redirect to /login when token is invalid', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const request = createMockRequest('/dashboard', {
        'auth-token': 'invalid-token',
      });
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.headers.get('location')).toContain('/login');
    });

    it('should redirect to /login when token is expired', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      const request = createMockRequest('/dashboard', {
        'auth-token': 'expired-token',
      });
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.headers.get('location')).toContain('/login');
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should allow admin to access /admin routes', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({
        userId: '123',
        email: 'admin@example.com',
        role: 'admin',
      });

      const request = createMockRequest('/admin/users', {
        'auth-token': 'admin-token',
      });
      const response = await middleware(request);
      
      expect(response).toBeUndefined();
    });

    it('should block non-admin from accessing /admin routes', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({
        userId: '123',
        email: 'user@example.com',
        role: 'user',
      });

      const request = createMockRequest('/admin/users', {
        'auth-token': 'user-token',
      });
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).toBe(403); // Forbidden
    });

    it('should allow pm_specialist to access /workorders', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({
        userId: '123',
        email: 'pm@example.com',
        role: 'pm_specialist',
      });

      const request = createMockRequest('/workorders', {
        'auth-token': 'pm-token',
      });
      const response = await middleware(request);
      
      expect(response).toBeUndefined();
    });

    it('should block technician from accessing /finance routes', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({
        userId: '123',
        email: 'tech@example.com',
        role: 'technician',
      });

      const request = createMockRequest('/finance/invoices', {
        'auth-token': 'tech-token',
      });
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).toBe(403);
    });
  });

  describe('API Route Protection', () => {
    it('should protect /api/workorders with authentication', async () => {
      const request = createMockRequest('/api/workorders');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).toBe(401); // Unauthorized
    });

    it('should allow authenticated API access', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({
        userId: '123',
        email: 'test@example.com',
        role: 'user',
      });

      const request = createMockRequest('/api/workorders', {
        'auth-token': 'valid-token',
      });
      const response = await middleware(request);
      
      expect(response).toBeUndefined();
    });

    it('should return 401 for /api routes without token', async () => {
      const request = createMockRequest('/api/users/profile');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).toBe(401);
    });
  });

  describe('Marketplace Routes', () => {
    it('should allow access to /marketplace without authentication', async () => {
      const request = createMockRequest('/marketplace');
      const response = await middleware(request);
      
      expect(response).toBeUndefined();
    });

    it('should allow access to /marketplace/services without authentication', async () => {
      const request = createMockRequest('/marketplace/services');
      const response = await middleware(request);
      
      expect(response).toBeUndefined();
    });

    it('should protect /marketplace/checkout with authentication', async () => {
      const request = createMockRequest('/marketplace/checkout');
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.headers.get('location')).toContain('/login');
    });
  });

  describe('Static Assets and Special Routes', () => {
    it('should skip middleware for /_next/* routes', async () => {
      const request = createMockRequest('/_next/static/chunk.js');
      const response = await middleware(request);
      
      expect(response).toBeUndefined();
    });

    it('should skip middleware for /api/health check', async () => {
      const request = createMockRequest('/api/health');
      const response = await middleware(request);
      
      expect(response).toBeUndefined();
    });

    it('should skip middleware for /favicon.ico', async () => {
      const request = createMockRequest('/favicon.ico');
      const response = await middleware(request);
      
      expect(response).toBeUndefined();
    });
  });

  describe('Redirect Behavior', () => {
    it('should preserve query parameters when redirecting to login', async () => {
      const request = createMockRequest('/dashboard?tab=workorders&filter=active');
      const response = await middleware(request);
      
      expect(response?.headers.get('location')).toContain('/login');
      expect(response?.headers.get('location')).toContain('callbackUrl=%2Fdashboard');
    });

    it('should redirect authenticated users away from /login to /dashboard', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({
        userId: '123',
        email: 'test@example.com',
        role: 'user',
      });

      const request = createMockRequest('/login', {
        'auth-token': 'valid-token',
      });
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.headers.get('location')).toContain('/dashboard');
    });
  });

  describe('JWT Validation Edge Cases', () => {
    it('should handle malformed JWT gracefully', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify.mockImplementation(() => {
        throw new Error('Malformed token');
      });

      const request = createMockRequest('/dashboard', {
        'auth-token': 'malformed.jwt.token',
      });
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.headers.get('location')).toContain('/login');
    });

    it('should handle missing JWT_SECRET gracefully', async () => {
      delete process.env.JWT_SECRET;

      const request = createMockRequest('/dashboard', {
        'auth-token': 'some-token',
      });
      const response = await middleware(request);
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).toBe(500); // Internal server error
    });

    it('should allow valid JWT to proceed without errors', async () => {
      const jwt = require('jsonwebtoken');
      const mockDecoded = {
        userId: '123',
        email: 'test@example.com',
        role: 'admin',
      };
      jwt.verify.mockReturnValue(mockDecoded);

      const request = createMockRequest('/dashboard', {
        'auth-token': 'valid-token',
      });
      const response = await middleware(request);
      
      // Middleware allows request to proceed when JWT is valid
      expect(response).toBeUndefined();
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret-key-for-testing-only');
    });
  });
});
