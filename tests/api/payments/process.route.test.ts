/**
 * @fileoverview Tests for Payments Process API
 * @description Tests the /api/payments/process endpoint
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

vi.mock('@/lib/middleware/rate-limit', () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

import { getSessionOrNull } from '@/lib/auth/session';

describe.skip('Payments Process API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { user: { id: 'user-123', orgId: 'org-123', role: 'user' } },
      response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  describe.skip('POST /api/payments/process', () => {
    it('should reject unauthenticated requests', async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: null,
        response: null,
      } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);

      const { POST } = await import('@/app/api/payments/process/route');
      const req = new NextRequest('http://localhost:3000/api/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100 }),
      });

      const response = await POST(req);
      expect(response.status).toBe(401);
    });
  });
});
