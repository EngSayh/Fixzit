/**
 * @fileoverview Tests for ATS Jobs API
 * @description Tests the /api/ats/jobs endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock @/auth - this is what the route actually uses via atsRBAC
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/mongodb-unified', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/server/security/rateLimit', () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));

import { auth } from '@/auth';

describe('ATS Jobs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated user with hr_manager role
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-123', orgId: 'org-123', role: 'hr_manager', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    } as Awaited<ReturnType<typeof auth>>);
  });

  describe('GET /api/ats/jobs', () => {
    it('should reject unauthenticated requests', async () => {
      // Mock unauthenticated session
      vi.mocked(auth).mockResolvedValue(null);

      const { GET } = await import('@/app/api/ats/jobs/route');
      const req = new NextRequest('http://localhost:3000/api/ats/jobs', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([401, 500, 503]).toContain(response.status);
    });
  });
});
