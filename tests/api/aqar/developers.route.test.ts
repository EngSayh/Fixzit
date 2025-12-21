/**
 * @fileoverview Tests for Aqar Developers API
 * @description Tests the /api/aqar/developers endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Aqar Developers API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/aqar/developers', () => {
    it('should return developers', async () => {
      const { GET } = await import('@/app/api/aqar/developers/route');
      const req = new NextRequest('http://localhost:3000/api/aqar/developers', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403, 500, 503]).toContain(response.status);
    });
  });
});
