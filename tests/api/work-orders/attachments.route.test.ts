/**
import { expectAuthFailure } from '@/tests/api/_helpers';
 * @fileoverview Tests for Work Orders Attachments API
 * @description Tests the /api/work-orders/[id]/attachments endpoint
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

describe.skip('Work Orders Attachments API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { user: { id: 'user-123', orgId: 'org-123', role: 'technician' } },
      response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  describe.skip('GET /api/work-orders/[id]/attachments', () => {
    it('should reject unauthenticated requests', async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: null,
        response: null,
      } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);

      const { GET } = await import('@/app/api/work-orders/[id]/attachments/route');
      const req = new NextRequest('http://localhost:3000/api/work-orders/wo-123/attachments', {
        method: 'GET',
      });

      const response = await GET(req, { params: Promise.resolve({ id: 'wo-123' }) });
      expectAuthFailure(response);
    });
  });
});
