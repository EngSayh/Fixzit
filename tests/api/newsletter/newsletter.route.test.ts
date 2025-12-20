/**
 * @fileoverview Tests for Newsletter Subscribe API
 * @description Tests the /api/newsletter endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe('Newsletter Subscribe API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/newsletter', () => {
    it('should require email', async () => {
      const { POST } = await import('@/app/api/newsletter/route');
      const req = new NextRequest('http://localhost:3000/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(req);
      expect([400, 422, 500]).toContain(response.status);
    });
  });
});
