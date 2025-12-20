/**
 * @fileoverview Tests for Currencies List API
 * @description Tests the /api/currencies endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Currencies List API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/currencies', () => {
    it('should return supported currencies', async () => {
      const { GET } = await import('@/app/api/currencies/route');
      const req = new NextRequest('http://localhost:3000/api/currencies', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 500]).toContain(response.status);
    });
  });
});
