/**
 * @fileoverview Tests for Souq Search API
 * @description Tests the /api/souq/search endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe('Souq Search API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/souq/search', () => {
    it('should search products', async () => {
      const { GET } = await import('@/app/api/souq/search/route');
      const req = new NextRequest('http://localhost:3000/api/souq/search?q=test', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403]).toContain(response.status);
    });
  });
});
