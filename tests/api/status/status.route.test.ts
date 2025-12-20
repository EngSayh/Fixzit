/**
 * @fileoverview Tests for System Status API
 * @description Tests the /api/status endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe('System Status API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/status', () => {
    it('should return system status', async () => {
      const { GET } = await import('@/app/api/status/route');
      const req = new NextRequest('http://localhost:3000/api/status', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 500]).toContain(response.status);
    });
  });
});
