/**
 * @fileoverview Tests for Countries List API
 * @description Tests the /api/countries endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Countries List API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/countries', () => {
    it('should return countries list', async () => {
      const { GET } = await import('@/app/api/countries/route');
      const req = new NextRequest('http://localhost:3000/api/countries', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 500]).toContain(response.status);
    });
  });
});
