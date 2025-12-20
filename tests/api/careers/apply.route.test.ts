/**
 * @fileoverview Tests for Careers Applications API
 * @description Tests the /api/careers/apply endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/middleware/rate-limit', () => ({
  enforceRateLimit: vi.fn().mockReturnValue(null),
}));

describe('Careers Apply API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/careers/apply', () => {
    it('should require valid application data', async () => {
      const { POST } = await import('@/app/api/careers/apply/route');
      const req = new NextRequest('http://localhost:3000/api/careers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(req);
      expect([400, 422]).toContain(response.status);
    });
  });
});
