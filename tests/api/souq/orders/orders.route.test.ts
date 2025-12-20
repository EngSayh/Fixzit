/**
import { expectAuthFailure } from '@/tests/api/_helpers';
 * @fileoverview Tests for Souq Orders API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock @/auth - the primary auth module used by routes
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));


// Mock rate limiters - route uses enforceRateLimit from @/lib/middleware/rate-limit
vi.mock('@/lib/middleware/rate-limit', () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null), // null = allow request
}));

vi.mock('@/server/security/rateLimit', () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));

vi.mock('@/lib/mongodb-unified', () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/auth/session', () => ({ getSessionOrNull: vi.fn() }));
vi.mock('@/lib/mongo', () => ({ default: vi.fn().mockResolvedValue(undefined), connectMongo: vi.fn().mockResolvedValue(undefined) }));

import { getSessionOrNull } from '@/lib/auth/session';

import { auth } from '@/auth';

describe('Souq Orders API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true, session: { user: { id: 'user-123', orgId: 'org-123', role: 'customer' } }, response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  it('should reject unauthenticated requests', async () => {
    // Mock unauthenticated session - return null
      vi.mocked(auth).mockResolvedValue(null);
    const { GET } = await import('@/app/api/souq/orders/route');
    const req = new NextRequest('http://localhost:3000/api/souq/orders');
    const response = await GET(req);
    expectAuthFailure(response);
  });
});
