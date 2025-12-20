/**
 * @fileoverview Tests for CRM Deals API
 * @description Tests the /api/crm/deals endpoint
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

describe.skip('CRM Deals API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { user: { id: 'user-123', orgId: 'org-123', role: 'sales' } },
      response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  describe.skip('GET /api/crm/deals', () => {
    it('should reject unauthenticated requests', async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: null,
        response: null,
      } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);

      const { GET } = await import('@/app/api/crm/deals/route');
      const req = new NextRequest('http://localhost:3000/api/crm/deals', {
        method: 'GET',
      });

      const response = await GET(req);
      expect(response.status).toBe(401);
    });
  });
});
