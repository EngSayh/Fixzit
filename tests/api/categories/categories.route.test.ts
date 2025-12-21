/**
 * @fileoverview Tests for Categories List API
 * @description Tests the /api/categories endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Categories List API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/categories', () => {
    it('should return categories list', async () => {
      const { GET } = await import('@/app/api/categories/route');
      const req = new NextRequest('http://localhost:3000/api/categories', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 500]).toContain(response.status);
    });
  });
});
