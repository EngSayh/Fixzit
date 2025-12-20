/**
 * @fileoverview Tests for Health Readiness API
 * @description Tests the /api/health/readiness endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Health Readiness API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/health/readiness', () => {
    it('should return readiness status', async () => {
      const { GET } = await import('@/app/api/health/readiness/route');
      const req = new NextRequest('http://localhost:3000/api/health/readiness', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 503]).toContain(response.status);
    });
  });
});
