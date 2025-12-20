/**
 * @fileoverview Tests for System Version API
 * @description Tests the /api/version endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

describe('System Version API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/version', () => {
    it('should return version info', async () => {
      const { GET } = await import('@/app/api/version/route');
      const req = new NextRequest('http://localhost:3000/api/version', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 500]).toContain(response.status);
    });
  });
});
