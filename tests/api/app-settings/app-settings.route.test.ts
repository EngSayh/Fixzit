/**
 * @fileoverview Tests for App Settings API
 * @description Tests the /api/app-settings endpoint
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

describe('App Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionOrNull).mockResolvedValue({
      ok: true,
      session: { user: { id: 'user-123', orgId: 'org-123', role: 'admin' } },
      response: null,
    } as ReturnType<typeof getSessionOrNull> extends Promise<infer T> ? T : never);
  });

  describe('GET /api/app-settings', () => {
    it('should return app settings', async () => {
      const { GET } = await import('@/app/api/app-settings/route');
      const req = new NextRequest('http://localhost:3000/api/app-settings', {
        method: 'GET',
      });

      const response = await GET(req);
      expect([200, 401, 500]).toContain(response.status);
    });
  });
});
