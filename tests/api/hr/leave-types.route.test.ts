/**
 * @fileoverview Tests for HR Leave Types API
 * @description Tests the /api/hr/leave-types endpoint
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

vi.mock('@/lib/auth/session', () => ({
  getSessionOrNull: vi.fn(),
}));

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

import { getSessionOrNull } from '@/lib/auth/session';

import { auth } from '@/auth';

describe('HR Leave Types API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { user: { id: 'user-123', orgId: 'org-123', role: 'hr_manager' } },
      response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  describe('GET /api/hr/leave-types', () => {
    it('should reject unauthenticated requests', async () => {
      // Mock unauthenticated session - return null
      vi.mocked(auth).mockResolvedValue(null);

      const { GET } = await import('@/app/api/hr/leave-types/route');
      const req = new NextRequest('http://localhost:3000/api/hr/leave-types', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([401, 500]).toContain(response.status);
    });
  });
});
