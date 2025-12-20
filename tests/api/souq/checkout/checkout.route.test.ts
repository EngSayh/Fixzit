/**
 * @fileoverview Tests for Souq Checkout API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/session', () => ({ getSessionOrNull: vi.fn() }));
vi.mock('@/lib/mongo', () => ({ default: vi.fn().mockResolvedValue(undefined), connectMongo: vi.fn().mockResolvedValue(undefined) }));

import { getSessionOrNull } from '@/lib/auth/session';

describe.skip('Souq Checkout API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true, session: { user: { id: 'user-123', orgId: 'org-123', role: 'customer' } }, response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  it('should reject unauthenticated checkout', async () => {
    vi.mocked(getSessionOrNull).mockResolvedValue({ ok: true, session: null, response: null } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
    const { POST } = await import('@/app/api/souq/checkout/route');
    const req = new NextRequest('http://localhost:3000/api/souq/checkout', { method: 'POST', body: JSON.stringify({}) });
    const response = await POST(req);
    expect(response.status).toBe(401);
  });
});
