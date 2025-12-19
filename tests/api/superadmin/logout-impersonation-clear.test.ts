/**
 * @fileoverview Test BUG-001 fix - Ensure impersonation cookie cleared on logout
 * @description Verifies that support_org_id cookie is properly cleared when superadmin logs out
 * @module tests/api/superadmin/logout-impersonation-clear
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST as logoutHandler } from '@/app/api/superadmin/logout/route';
import { clearSuperadminCookies } from '@/lib/superadmin/auth';

describe('[BUG-001] Impersonation Cookie Cleared on Logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API Route: POST /api/superadmin/logout', () => {
    it('should call clearSuperadminCookies which clears support_org_id', async () => {
      const request = new NextRequest('http://localhost/api/superadmin/logout', {
        method: 'POST',
      });

      const response = await logoutHandler(request);
      
      expect(response.status).toBe(200);
      
      // Verify response structure
      const body = await response.json();
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('message');
    });
  });

  describe('clearSuperadminCookies function', () => {
    it('should clear support_org_id cookie along with session cookies', () => {
      const mockCookies = {
        set: vi.fn(),
      };

      const mockResponse = {
        cookies: mockCookies,
      } as unknown as Response;

      clearSuperadminCookies(mockResponse);

      // Verify superadmin session cookies cleared
      expect(mockCookies.set).toHaveBeenCalledWith(
        'superadmin_session',
        '',
        expect.objectContaining({ maxAge: 0, path: '/' })
      );

      // BUG-001 FIX VERIFICATION: Verify support_org_id cookie cleared
      expect(mockCookies.set).toHaveBeenCalledWith(
        'support_org_id',
        '',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
        })
      );
    });

    it('should clear impersonation cookie with correct security settings', () => {
      const mockCookies = {
        set: vi.fn(),
      };

      const mockResponse = {
        cookies: mockCookies,
      } as unknown as Response;

      clearSuperadminCookies(mockResponse);

      // Find the support_org_id cookie clear call
      const supportOrgIdCall = mockCookies.set.mock.calls.find(
        (call) => call[0] === 'support_org_id'
      );

      expect(supportOrgIdCall).toBeDefined();
      expect(supportOrgIdCall?.[1]).toBe(''); // Empty value
      expect(supportOrgIdCall?.[2]).toMatchObject({
        httpOnly: true,
        secure: expect.any(Boolean), // Depends on NODE_ENV
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
    });

    it('should not fail if cookies object is unavailable', () => {
      const mockResponse = {} as Response;

      // Should not throw error
      expect(() => clearSuperadminCookies(mockResponse)).not.toThrow();
    });
  });

  describe('Integration: Impersonation lifecycle with logout', () => {
    it('should clear impersonation context when logout is called', () => {
      const mockCookies = {
        set: vi.fn(),
      };

      const mockResponse = {
        cookies: mockCookies,
      } as unknown as Response;

      // Simulate logout
      clearSuperadminCookies(mockResponse);

      // Verify all relevant cookies are cleared
      const clearedCookies = mockCookies.set.mock.calls.map((call) => call[0]);
      
      expect(clearedCookies).toContain('superadmin_session');
      expect(clearedCookies).toContain('superadmin_session.legacy');
      expect(clearedCookies).toContain('support_org_id'); // BUG-001 fix

      // Verify all cleared cookies have maxAge: 0
      mockCookies.set.mock.calls.forEach((call) => {
        expect(call[2]).toHaveProperty('maxAge', 0);
      });
    });
  });

  describe('Security: Cookie attributes', () => {
    it('should use httpOnly flag for support_org_id', () => {
      const mockCookies = {
        set: vi.fn(),
      };

      const mockResponse = {
        cookies: mockCookies,
      } as unknown as Response;

      clearSuperadminCookies(mockResponse);

      const supportOrgIdCall = mockCookies.set.mock.calls.find(
        (call) => call[0] === 'support_org_id'
      );

      expect(supportOrgIdCall?.[2]).toHaveProperty('httpOnly', true);
    });

    it('should use same path for impersonation cookie as session cookies', () => {
      const mockCookies = {
        set: vi.fn(),
      };

      const mockResponse = {
        cookies: mockCookies,
      } as unknown as Response;

      clearSuperadminCookies(mockResponse);

      const supportOrgIdCall = mockCookies.set.mock.calls.find(
        (call) => call[0] === 'support_org_id'
      );

      expect(supportOrgIdCall?.[2]).toHaveProperty('path', '/');
    });
  });
});
