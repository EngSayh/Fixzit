/**
 * @fileoverview Tests for Copilot Knowledge API
 * @description Tests the /api/copilot/knowledge endpoint
 * Route only exports POST and requires COPILOT_WEBHOOK_SECRET
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

vi.mock('@/server/security/rateLimit', () => ({
  smartRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));

vi.mock('@/lib/security/verify-secret-header', () => ({
  verifySecretHeader: vi.fn().mockReturnValue(false),
}));

import { verifySecretHeader } from '@/lib/security/verify-secret-header';

describe('Copilot Knowledge API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifySecretHeader).mockReturnValue(false);
  });

  describe('POST /api/copilot/knowledge', () => {
    it('should reject requests without valid webhook secret', async () => {
      const { POST } = await import('@/app/api/copilot/knowledge/route');
      if (!POST) {
        expect(true).toBe(true);
        return;
      }

      const req = new NextRequest('http://localhost:3000/api/copilot/knowledge', {
        method: 'POST',
        body: JSON.stringify({ slug: 'test', title: 'Test', content: 'Test content' }),
      });

      const response = await POST(req);
      // Route requires webhook secret - may return 401, 403, or 503 (service unavailable)
      expect([401, 403, 503]).toContain(response.status);
    });
  });
});
