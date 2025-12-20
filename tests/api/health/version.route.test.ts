/**
 * @fileoverview Tests for Health Version API
 * @description Tests the /api/health/version endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

describe.skip('Health Version API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/health/version', () => {
    it('should return version info', async () => {
      const { GET } = await import('@/app/api/health/version/route');
      const req = new NextRequest('http://localhost:3000/api/health/version', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200]).toContain(response.status);
    });
  });
});
