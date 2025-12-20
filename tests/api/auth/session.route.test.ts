/**
 * @fileoverview Tests for Auth Session API
 * @description Tests the /api/auth/session endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Auth Session API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/auth/session', () => {
    it('should return session info', async () => {
      const { GET } = await import('@/app/api/auth/session/route');
      const req = new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401]).toContain(response.status);
    });
  });
});
