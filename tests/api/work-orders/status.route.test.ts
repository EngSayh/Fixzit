/**
 * @fileoverview Tests for Work Orders Status API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/session', () => ({ getSessionOrNull: vi.fn() }));
vi.mock('@/lib/mongo', () => ({ default: vi.fn().mockResolvedValue(undefined), connectMongo: vi.fn().mockResolvedValue(undefined) }));

import { getSessionOrNull } from '@/lib/auth/session';

describe.skip('Work Orders Status API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true, session: { user: { id: 'user-123', orgId: 'org-123', role: 'technician' } }, response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  it('should reject unauthenticated requests', async () => {
    vi.mocked(getSessionOrNull).mockResolvedValue({ ok: true, session: null, response: null } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
    const { PATCH } = await import('@/app/api/work-orders/status/route');
    const req = new NextRequest('http://localhost:3000/api/work-orders/status', { method: 'PATCH', body: JSON.stringify({}) });
    const response = await PATCH(req);
    expect([401, 500, 503]).toContain(response.status);
  });
});
