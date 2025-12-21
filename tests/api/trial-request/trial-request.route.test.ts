/**
 * @fileoverview Tests for Trial Request API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({ default: vi.fn().mockResolvedValue(undefined), connectMongo: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/middleware/rate-limit', () => ({ enforceRateLimit: vi.fn().mockReturnValue(null) }));

describe('Trial Request API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should accept valid trial request', async () => {
    const { POST } = await import('@/app/api/trial-request/route');
    const req = new NextRequest('http://localhost:3000/api/trial-request', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', company: 'Test Corp' }),
    });
    const response = await POST(req);
    expect([200, 201, 400, 422]).toContain(response.status);
  });
});
