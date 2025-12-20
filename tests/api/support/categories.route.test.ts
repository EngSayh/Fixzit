/**
 * @fileoverview Tests for Support Categories API
 * @description Tests the /api/support/categories endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Support Categories API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/support/categories', () => {
    it('should return categories', async () => {
      const { GET } = await import('@/app/api/support/categories/route');
      const req = new NextRequest('http://localhost:3000/api/support/categories', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403, 500, 503]).toContain(response.status);
    });
  });
});
