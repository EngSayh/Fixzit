/**
 * @fileoverview Tests for Contact Form API
 * @description Tests the /api/contact endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe('Contact Form API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/contact', () => {
    it('should require valid form data', async () => {
      const { POST } = await import('@/app/api/contact/route');
      const req = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(req);
      expect([400, 422, 500]).toContain(response.status);
    });
  });
});
