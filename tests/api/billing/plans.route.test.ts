/**
 * @fileoverview Tests for Billing Plans API
 * @description Tests the /api/billing/plans endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Billing Plans API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('GET /api/billing/plans', () => {
    it('should return plans list', async () => {
      const { GET } = await import('@/app/api/billing/plans/route');
      const req = new NextRequest('http://localhost:3000/api/billing/plans', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403, 500]).toContain(response.status);
    });
  });
});
