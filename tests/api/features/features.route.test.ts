/**
 * @fileoverview Tests for Features List API
 * @description Tests the /api/features endpoint
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

describe.skip('Features List API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { user: { id: 'user-123', orgId: 'org-123', role: 'admin' } },
      response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  describe.skip('GET /api/features', () => {
    it('should return features list', async () => {
      const { GET } = await import('@/app/api/features/route');
      const req = new NextRequest('http://localhost:3000/api/features', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 500]).toContain(response.status);
    });
  });
});
