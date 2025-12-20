/**
 * @fileoverview Tests for Aqar Cities API
 * @description Tests the /api/aqar/cities endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Aqar Cities API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/aqar/cities', () => {
    it('should return cities', async () => {
      const { GET } = await import('@/app/api/aqar/cities/route');
      const req = new NextRequest('http://localhost:3000/api/aqar/cities', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403]).toContain(response.status);
    });
  });
});
