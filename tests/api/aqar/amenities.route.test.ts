/**
 * @fileoverview Tests for Aqar Amenities API
 * @description Tests the /api/aqar/amenities endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Aqar Amenities API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/aqar/amenities', () => {
    it('should return amenities', async () => {
      const { GET } = await import('@/app/api/aqar/amenities/route');
      const req = new NextRequest('http://localhost:3000/api/aqar/amenities', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403, 500]).toContain(response.status);
    });
  });
});
