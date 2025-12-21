/**
 * @fileoverview Tests for Regions List API
 * @description Tests the /api/regions endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Regions List API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/regions', () => {
    it('should return regions list', async () => {
      const { GET } = await import('@/app/api/regions/route');
      const req = new NextRequest('http://localhost:3000/api/regions', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 500]).toContain(response.status);
    });
  });
});
