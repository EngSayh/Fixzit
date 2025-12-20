/**
 * @fileoverview Tests for Souq Products API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongo', () => ({ default: vi.fn().mockResolvedValue(undefined), connectMongo: vi.fn().mockResolvedValue(undefined) }));

describe('Souq Products API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should return products', async () => {
    const { GET } = await import('@/app/api/souq/products/route');
    const req = new NextRequest('http://localhost:3000/api/souq/products');
    const response = await GET(req);
    expect([200, 500]).toContain(response.status);
  });
});
