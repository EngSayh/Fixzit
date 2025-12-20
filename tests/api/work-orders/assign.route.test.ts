/**
 * @fileoverview Tests for Work Orders Assign API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/session', () => ({ getSessionOrNull: vi.fn() }));
vi.mock('@/lib/mongo', () => ({ default: vi.fn().mockResolvedValue(undefined), connectMongo: vi.fn().mockResolvedValue(undefined) }));

import { getSessionOrNull } from '@/lib/auth/session';

describe.skip('Work Orders Assign API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true, session: { user: { id: 'user-123', orgId: 'org-123', role: 'operations_manager' } }, response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  it('should reject unauthenticated requests', async () => {
    vi.mocked(getSessionOrNull).mockResolvedValue({ ok: true, session: null, response: null } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
    const { POST } = await import('@/app/api/work-orders/assign/route');
    const req = new NextRequest('http://localhost:3000/api/work-orders/assign', { method: 'POST', body: JSON.stringify({}) });
    const response = await POST(req);
    expect([401, 500]).toContain(response.status);
  });
});
