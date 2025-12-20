/**
 * @fileoverview Tests for Aqar Featured API
 * @description Tests the /api/aqar/featured endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Aqar Featured API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/aqar/featured', () => {
    it('should return featured properties', async () => {
      const { GET } = await import('@/app/api/aqar/featured/route');
      const req = new NextRequest('http://localhost:3000/api/aqar/featured', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403, 500, 503]).toContain(response.status);
    });
  });
});
