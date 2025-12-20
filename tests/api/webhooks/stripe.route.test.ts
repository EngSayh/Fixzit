/**
 * @fileoverview Tests for Webhooks Stripe API
 * @description Tests the /api/webhooks/stripe endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe.skip('Webhooks Stripe API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.skip('POST /api/webhooks/stripe', () => {
    it('should require valid signature', async () => {
      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const req = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'payment_intent.succeeded' }),
      });

      const response = await POST(req);
      expect([400, 401, 403]).toContain(response.status);
    });
  });
});
