/**
 * @fileoverview Tests for Health Liveness API
 * @description Tests the /api/health/liveness endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

describe.skip('Health Liveness API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/health/liveness', () => {
    it('should return liveness status', async () => {
      const { GET } = await import('@/app/api/health/liveness/route');
      const req = new NextRequest('http://localhost:3000/api/health/liveness', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200]).toContain(response.status);
    });
  });
});
