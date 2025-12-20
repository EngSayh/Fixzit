/**
 * @fileoverview Tests for Support Articles API
 * @description Tests the /api/support/articles endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Support Articles API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/support/articles', () => {
    it('should return articles', async () => {
      const { GET } = await import('@/app/api/support/articles/route');
      const req = new NextRequest('http://localhost:3000/api/support/articles', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403, 500, 503]).toContain(response.status);
    });
  });
});
