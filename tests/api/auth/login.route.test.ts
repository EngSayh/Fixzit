/**
 * @fileoverview Tests for Auth Login API
 * @description Tests the /api/auth/login endpoint
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

describe.skip('Auth Login API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('POST /api/auth/login', () => {
    it('should require valid credentials', async () => {
      const { POST } = await import('@/app/api/auth/login/route');
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com' }),
      });

      const response = await POST(req);
      expect([400, 401, 422]).toContain(response.status);
    });
  });
});
