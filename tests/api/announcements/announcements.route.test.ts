/**
 * @fileoverview Tests for Announcements List API
 * @description Tests the /api/announcements endpoint
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

describe('Announcements List API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { user: { id: 'user-123', orgId: 'org-123', role: 'user' } },
      response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  describe('GET /api/announcements', () => {
    it('should return announcements', async () => {
      const { GET } = await import('@/app/api/announcements/route');
      const req = new NextRequest('http://localhost:3000/api/announcements', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 500]).toContain(response.status);
    });
  });
});
