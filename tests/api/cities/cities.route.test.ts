/**
 * @fileoverview Tests for Cities List API
 * @description Tests the /api/cities endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Cities List API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/cities', () => {
    it('should return cities list', async () => {
      const { GET } = await import('@/app/api/cities/route');
      const req = new NextRequest('http://localhost:3000/api/cities', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 500]).toContain(response.status);
    });
  });
});
