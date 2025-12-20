/**
 * @fileoverview Tests for Auth Verify Email API
 * @description Tests the /api/auth/verify-email endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Auth Verify Email API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('POST /api/auth/verify-email', () => {
    it('should require token', async () => {
      const { POST } = await import('@/app/api/auth/verify-email/route');
      const req = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(req);
      expect([400, 401, 422]).toContain(response.status);
    });
  });
});
