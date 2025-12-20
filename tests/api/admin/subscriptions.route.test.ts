/**
 * @fileoverview Tests for Admin Subscriptions API
 * @description Tests the /api/admin/subscriptions endpoint
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

describe.skip('Admin Subscriptions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { user: { id: 'user-123', orgId: 'org-123', role: 'super_admin' } },
      response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  describe.skip('GET /api/admin/subscriptions', () => {
    it('should reject unauthenticated requests', async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: null,
        response: null,
      } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);

      const { GET } = await import('@/app/api/admin/subscriptions/route');
      const req = new NextRequest('http://localhost:3000/api/admin/subscriptions', {
        method: 'GET',
      });

      const response = await GET(req);
      expect(response.status).toBe(401);
    });
  });
});
