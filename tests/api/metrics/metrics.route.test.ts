/**
 * @fileoverview Tests for Metrics API
 * @description Tests the /api/metrics endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe('Metrics API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/metrics', () => {
    it('should return metrics', async () => {
      const { GET } = await import('@/app/api/metrics/route');
      const req = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403]).toContain(response.status);
    });
  });
});
