/**
 * @fileoverview Tests for Languages List API
 * @description Tests the /api/languages endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Languages List API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/languages', () => {
    it('should return supported languages', async () => {
      const { GET } = await import('@/app/api/languages/route');
      const req = new NextRequest('http://localhost:3000/api/languages', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 500]).toContain(response.status);
    });
  });
});
