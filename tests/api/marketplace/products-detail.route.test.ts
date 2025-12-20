/**
 * @fileoverview Tests for Marketplace Product Detail API
 * @description Tests the /api/marketplace/products/[id] endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Marketplace Product Detail API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/marketplace/products/[id]', () => {
    it('should return product detail', async () => {
      const { GET } = await import('@/app/api/marketplace/products/[id]/route');
      const req = new NextRequest('http://localhost:3000/api/marketplace/products/prod-123', {
        method: 'GET',
      });

      const response = await GET(req, { params: Promise.resolve({ id: 'prod-123' }) });
      expect([200, 404]).toContain(response.status);
    });
  });
});
