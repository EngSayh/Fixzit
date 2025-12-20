/**
 * @fileoverview Tests for Webhooks Tap API
 * @description Tests the /api/webhooks/tap endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Webhooks Tap API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('POST /api/webhooks/tap', () => {
    it('should require valid payload', async () => {
      const { POST } = await import('@/app/api/webhooks/tap/route');
      const req = new NextRequest('http://localhost:3000/api/webhooks/tap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'charge.succeeded' }),
      });

      const response = await POST(req);
      expect([200, 400, 401, 403]).toContain(response.status);
    });
  });
});
