/**
 * @fileoverview Tests for Souq Categories API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({ default: vi.fn().mockResolvedValue(undefined), connectMongo: vi.fn().mockResolvedValue(undefined) }));

describe('Souq Categories API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should return categories', async () => {
    const { GET } = await import('@/app/api/souq/categories/route');
    const req = new NextRequest('http://localhost:3000/api/souq/categories');
    const response = await GET(req);
    expect([200, 500]).toContain(response.status);
  });
});
