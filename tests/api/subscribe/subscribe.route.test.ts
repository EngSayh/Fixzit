/**
 * @fileoverview Tests for Subscribe API
 * @description Tests the /api/subscribe endpoint
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

describe.skip('Subscribe API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('POST /api/subscribe', () => {
    it('should require valid email', async () => {
      const { POST } = await import('@/app/api/subscribe/route');
      const req = new NextRequest('http://localhost:3000/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid' }),
      });

      const response = await POST(req);
      expect([400, 422]).toContain(response.status);
    });
  });
});
