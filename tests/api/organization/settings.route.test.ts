/**
 * @fileoverview Tests for Organization Settings API
 * @description Tests the /api/organization/settings endpoint
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
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/middleware/rate-limit', () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

// Mock getSessionUser to throw UnauthorizedError for unauthenticated tests
vi.mock('@/server/middleware/withAuthRbac', () => ({
  getSessionUser: vi.fn().mockRejectedValue(new Error('Unauthenticated')),
  UnauthorizedError: class UnauthorizedError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'UnauthorizedError';
    }
  },
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

describe('Organization Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { user: { id: 'user-123', orgId: 'org-123', role: 'admin' } },
      response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  describe('GET /api/organization/settings', () => {
    it('should return default branding for unauthenticated requests', async () => {
      // Route is public - unauthenticated users get default branding
      vi.mocked(auth).mockResolvedValue(null);

      const { GET } = await import('@/app/api/organization/settings/route');
      const req = new NextRequest('http://localhost:3000/api/organization/settings', {
        method: 'GET',
      });

      const response = await GET(req);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe('FIXZIT ENTERPRISE');
    });
  });
});
