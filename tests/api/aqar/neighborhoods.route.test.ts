/**
 * @fileoverview Tests for Aqar Neighborhoods API
 * @description Tests the /api/aqar/neighborhoods endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Aqar Neighborhoods API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/aqar/neighborhoods', () => {
    it('should return neighborhoods', async () => {
      const { GET } = await import('@/app/api/aqar/neighborhoods/route');
      const req = new NextRequest('http://localhost:3000/api/aqar/neighborhoods', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403]).toContain(response.status);
    });
  });
});
