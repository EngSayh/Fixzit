/**
 * @fileoverview Tests for RFQs Quotes API
 * @description Tests the /api/rfqs/[id]/quotes endpoint
 */
import { expectAuthFailure } from '@/tests/api/_helpers';

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

describe.skip('RFQs Quotes API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { user: { id: 'user-123', orgId: 'org-123', role: 'procurement' } },
      response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  describe.skip('GET /api/rfqs/[id]/quotes', () => {
    it('should reject unauthenticated requests', async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: null,
        response: null,
      } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);

      const { GET } = await import('@/app/api/rfqs/[id]/quotes/route');
      const req = new NextRequest('http://localhost:3000/api/rfqs/rfq-123/quotes', {
        method: 'GET',
      });

      const response = await GET(req, { params: Promise.resolve({ id: 'rfq-123' }) });
      expectAuthFailure(response);
    });
  });
});
