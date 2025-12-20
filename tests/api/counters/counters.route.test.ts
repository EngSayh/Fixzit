/**
 * @fileoverview Tests for Counters API
 * @description Tests the /api/counters endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock @/auth - the primary auth module used by routes
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/server/security/rateLimit', () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));

vi.mock('@/lib/mongodb-unified', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
  getDatabase: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      find: vi.fn().mockReturnThis(),
      findOne: vi.fn().mockResolvedValue(null),
      countDocuments: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
    }),
  }),
}));

vi.mock('@/lib/auth/session', () => ({
  getSessionOrNull: vi.fn(),
}));

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

import { getSessionOrNull } from '@/lib/auth/session';

import { auth } from '@/auth';

describe('Counters API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { user: { id: 'user-123', orgId: 'org-123', role: 'admin' } },
      response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  describe('GET /api/counters', () => {
    it('should return empty counters for unauthenticated requests (graceful degradation)', async () => {
      // Route returns 200 with empty object for guests to avoid 401 noise on public pages
      vi.mocked(auth).mockResolvedValue(null);

      const { GET } = await import('@/app/api/counters/route');
      const req = new NextRequest('http://localhost:3000/api/counters', {
        method: 'GET',
      });

      const response = await GET(req);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({});
    });
  });
});
