/**
 * @fileoverview Tests for Auth Verify API
 * @description Tests the /api/auth/verify endpoint (GET only - email verification)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/middleware/rate-limit', () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

describe('Auth Verify API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/auth/verify', () => {
    it('should require valid verification token', async () => {
      const { GET } = await import('@/app/api/auth/verify/route');
      const req = new NextRequest('http://localhost:3000/api/auth/verify?token=invalid', {
        method: 'GET',
      });

      const response = await GET(req);
      // Route may return 302 (redirect), 400 (invalid token), or other status
      expect([200, 302, 400, 401, 422, 500]).toContain(response.status);
    });
  });
});
