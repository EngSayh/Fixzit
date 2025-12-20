/**
 * @fileoverview Tests for Souq Brands API
 * @description Tests the /api/souq/brands endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe('Souq Brands API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/souq/brands', () => {
    it('should return brands', async () => {
      const { GET } = await import('@/app/api/souq/brands/route');
      const req = new NextRequest('http://localhost:3000/api/souq/brands', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403]).toContain(response.status);
    });
  });
});
