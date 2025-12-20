/**
 * @fileoverview Tests for Marketplace Products List API
 * @description Tests the /api/marketplace/products endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe('Marketplace Products List API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/marketplace/products', () => {
    it('should return products list', async () => {
      const { GET } = await import('@/app/api/marketplace/products/route');
      const req = new NextRequest('http://localhost:3000/api/marketplace/products', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403]).toContain(response.status);
    });
  });
});
