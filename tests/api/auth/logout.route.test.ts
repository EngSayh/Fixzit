/**
 * @fileoverview Tests for Auth Logout API
 * @description Tests the /api/auth/logout endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Auth Logout API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('POST /api/auth/logout', () => {
    it('should handle logout', async () => {
      const { POST } = await import('@/app/api/auth/logout/route');
      const req = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      });

      const response = await POST(req);
      expect([200, 302, 401]).toContain(response.status);
    });
  });
});
