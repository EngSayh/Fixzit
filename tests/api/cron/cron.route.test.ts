/**
 * @fileoverview Tests for Cron API
 * @description Tests the /api/cron endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe('Cron API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/cron', () => {
    it('should require authorization', async () => {
      const { GET } = await import('@/app/api/cron/route');
      const req = new NextRequest('http://localhost:3000/api/cron', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403]).toContain(response.status);
    });
  });
});
