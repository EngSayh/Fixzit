/**
 * @fileoverview Tests for Vendor Apply API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({ default: vi.fn().mockResolvedValue(undefined), connectMongo: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/middleware/rate-limit', () => ({ enforceRateLimit: vi.fn().mockReturnValue(null) }));

describe('Vendor Apply API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should require vendor details in body', async () => {
    const { POST } = await import('@/app/api/vendor/apply/route');
    const req = new NextRequest('http://localhost:3000/api/vendor/apply', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(req);
    expect([400, 422, 500]).toContain(response.status);
  });
});
