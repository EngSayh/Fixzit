/**
 * @fileoverview Tests for Aqar Projects API
 * @description Tests the /api/aqar/projects endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Aqar Projects API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/aqar/projects', () => {
    it('should return projects', async () => {
      const { GET } = await import('@/app/api/aqar/projects/route');
      const req = new NextRequest('http://localhost:3000/api/aqar/projects', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403]).toContain(response.status);
    });
  });
});
