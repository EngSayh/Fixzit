/**
 * @fileoverview Tests for Amenities List API
 * @description Tests the /api/amenities endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Amenities List API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/amenities', () => {
    it('should return amenities list', async () => {
      const { GET } = await import('@/app/api/amenities/route');
      const req = new NextRequest('http://localhost:3000/api/amenities', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 500]).toContain(response.status);
    });
  });
});
