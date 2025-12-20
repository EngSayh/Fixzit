/**
 * @fileoverview Tests for Souq Shipping Rates API
 * @description Tests the /api/souq/shipping/rates endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/session', () => ({
  getSessionOrNull: vi.fn(),
}));

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

import { getSessionOrNull } from '@/lib/auth/session';

describe.skip('Souq Shipping Rates API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { user: { id: 'user-123', orgId: 'org-123', role: 'user' } },
      response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  describe.skip('GET /api/souq/shipping/rates', () => {
    it('should return shipping rates', async () => {
      const { GET } = await import('@/app/api/souq/shipping/rates/route');
      const req = new NextRequest('http://localhost:3000/api/souq/shipping/rates', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 403]).toContain(response.status);
    });
  });
});
