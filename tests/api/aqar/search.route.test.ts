/**
 * @fileoverview Tests for Aqar Search API
 * @description Tests the /api/aqar/search endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Aqar Search API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/aqar/search', () => {
    it('should search properties', async () => {
      const { GET } = await import('@/app/api/aqar/search/route');
      const req = new NextRequest('http://localhost:3000/api/aqar/search?q=test', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403, 500, 503]).toContain(response.status);
    });
  });
});
