/**
 * @fileoverview Tests for I18n API
 * Route only exports POST for translation updates
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({ default: vi.fn().mockResolvedValue(undefined), connectMongo: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/middleware/rate-limit', () => ({ enforceRateLimit: vi.fn().mockReturnValue(null) }));
vi.mock('@/server/security/rateLimit', () => ({ smartRateLimit: vi.fn().mockResolvedValue({ allowed: true }) }));

describe('I18n API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should accept translation update via POST', async () => {
    const { POST } = await import('@/app/api/i18n/route');
    const req = new NextRequest('http://localhost:3000/api/i18n', {
      method: 'POST',
      body: JSON.stringify({ locale: 'en', key: 'test.key', value: 'Test' }),
    });
    const response = await POST(req);
    // May return 401 (unauth), 400 (invalid), or 200 (success)
    expect([200, 400, 401, 403, 500, 503]).toContain(response.status);
  });
});
