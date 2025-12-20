/**
 * @fileoverview Tests for Properties Tenants API
 * @description Tests the /api/properties/[id]/tenants endpoint
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

describe.skip('Properties Tenants API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { user: { id: 'user-123', orgId: 'org-123', role: 'admin' } },
      response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  describe.skip('GET /api/properties/[id]/tenants', () => {
    it('should reject unauthenticated requests', async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: null,
        response: null,
      } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);

      const { GET } = await import('@/app/api/properties/[id]/tenants/route');
      const req = new NextRequest('http://localhost:3000/api/properties/prop-123/tenants', {
        method: 'GET',
      });

      const response = await GET(req, { params: Promise.resolve({ id: 'prop-123' }) });
      expect(response.status).toBe(401);
    });
  });
});
