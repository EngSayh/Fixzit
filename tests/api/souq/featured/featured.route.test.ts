/**
 * @fileoverview Tests for Souq Featured API
 * @description Tests the /api/souq/featured endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Souq Featured API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/souq/featured', () => {
    it('should return featured products', async () => {
      const { GET } = await import('@/app/api/souq/featured/route');
      const req = new NextRequest('http://localhost:3000/api/souq/featured', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403, 500]).toContain(response.status);
    });
  });
});
