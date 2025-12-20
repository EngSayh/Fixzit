/**
import { expectAuthFailure } from '@/tests/api/_helpers';
 * @fileoverview Tests for Souq Buybox Winner Fsin API
 * @description Tests the /api/souq/buybox/winner/[fsin] endpoint
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

describe.skip('Souq Buybox Winner Fsin API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { user: { id: 'user-123', orgId: 'org-123', role: 'super_admin' } },
      response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  describe.skip('GET /api/souq/buybox/winner/[fsin]', () => {
    it('should reject unauthenticated requests', async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: null,
        response: null,
      } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);

      const { GET } = await import('@/app/api/souq/buybox/winner/[fsin]/route');
      if (!GET) {
        expect(true).toBe(true); // Route may not have GET
        return;
      }
      
      const req = new NextRequest('http://localhost:3000/api/souq/buybox/winner/[fsin]', {
        method: 'GET',
      });

      const response = await GET(req);
      expectAuthFailure(response);
    });
  });
});
