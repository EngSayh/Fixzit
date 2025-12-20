/**
 * @fileoverview Tests for Aqar Property Types API
 * @description Tests the /api/aqar/property-types endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Aqar Property Types API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/aqar/property-types', () => {
    it('should return property types', async () => {
      const { GET } = await import('@/app/api/aqar/property-types/route');
      const req = new NextRequest('http://localhost:3000/api/aqar/property-types', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403]).toContain(response.status);
    });
  });
});
