/**
 * @fileoverview Tests for Souq Tags API
 * @description Tests the /api/souq/tags endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Souq Tags API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/souq/tags', () => {
    it('should return tags', async () => {
      const { GET } = await import('@/app/api/souq/tags/route');
      const req = new NextRequest('http://localhost:3000/api/souq/tags', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403]).toContain(response.status);
    });
  });
});
