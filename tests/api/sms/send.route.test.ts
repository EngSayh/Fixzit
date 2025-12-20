/**
 * @fileoverview Tests for SMS Send API
 * @description Tests the /api/sms/send endpoint
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

describe.skip('SMS Send API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { user: { id: 'user-123', orgId: 'org-123', role: 'admin' } },
      response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  describe.skip('POST /api/sms/send', () => {
    it('should reject unauthenticated requests', async () => {
      vi.mocked(getSessionOrNull).mockResolvedValue({
        ok: true,
        session: null,
        response: null,
      } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);

      const { POST } = await import('@/app/api/sms/send/route');
      const req = new NextRequest('http://localhost:3000/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: '+966501234567', message: 'Test' }),
      });

      const response = await POST(req);
      expect(response.status).toBe(401);
    });
  });
});
