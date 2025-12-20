/**
 * @fileoverview Tests for I18n API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({ default: vi.fn().mockResolvedValue(undefined), connectMongo: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/middleware/rate-limit', () => ({ enforceRateLimit: vi.fn().mockReturnValue(null) }));

describe('I18n API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should return translations', async () => {
    const { GET } = await import('@/app/api/i18n/route');
    const req = new NextRequest('http://localhost:3000/api/i18n?locale=en');
    const response = await GET(req);
    expect([200, 304]).toContain(response.status);
  });
});
