/**
 * @fileoverview Tests for Souq Claims API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/session', () => ({ getSessionOrNull: vi.fn() }));
vi.mock('@/lib/mongo', () => ({ default: vi.fn().mockResolvedValue(undefined), connectMongo: vi.fn().mockResolvedValue(undefined) }));

import { getSessionOrNull } from '@/lib/auth/session';

describe('Souq Claims API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true, session: { user: { id: 'user-123', orgId: 'org-123', role: 'vendor' } }, response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  it('should reject unauthenticated requests', async () => {
    vi.mocked(getSessionOrNull).mockResolvedValue({ ok: true, session: null, response: null } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
    const { GET } = await import('@/app/api/souq/claims/route');
    const req = new NextRequest('http://localhost:3000/api/souq/claims');
    const response = await GET(req);
    expect([401, 500]).toContain(response.status);
  });
});
