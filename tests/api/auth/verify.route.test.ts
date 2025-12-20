/**
 * @fileoverview Tests for Auth Verify API
 * @description Tests the /api/auth/verify endpoint
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

  describe('POST /api/auth/verify', () => {
    it('should require valid verification data', async () => {
      const { POST } = await import('@/app/api/auth/verify/route');
      const req = new NextRequest('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(req);
      expect([400, 401, 422]).toContain(response.status);
    });
  });
});
