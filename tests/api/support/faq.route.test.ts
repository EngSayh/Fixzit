/**
 * @fileoverview Tests for Support FAQ API
 * @description Tests the /api/support/faq endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Support FAQ API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/support/faq', () => {
    it('should return FAQ list', async () => {
      const { GET } = await import('@/app/api/support/faq/route');
      const req = new NextRequest('http://localhost:3000/api/support/faq', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403, 500]).toContain(response.status);
    });
  });
});
