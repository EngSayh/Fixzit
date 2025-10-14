// Tests for GET handler in API route (marketplace products by slug)
// Framework: Vitest

import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// Mock next/server to control NextResponse.json behavior
vi.mock('next/server', () => {
  return {
    // Minimal stub for NextRequest type usage; not used by implementation
    NextRequest: class {},
    NextResponse: {
      json: (body: any, init?: ResponseInit) => {
        return {
          type: 'NextResponseMock',
          status: init?.status ?? 200,
          body
        };
      }
    }
  };
});

// Mock dependencies used by the current route implementation
vi.mock('@/lib/marketplace/context', () => {
  return {
    resolveMarketplaceContext: vi.fn()
  };
});

vi.mock('@/lib/marketplace/search', () => {
  return {
    findProductBySlug: vi.fn()
  };
});

vi.mock('@/db/mongoose', () => {
  return {
    dbConnect: vi.fn()
  };
});

vi.mock('@/server/models/marketplace/Category', () => ({
  __esModule: true,
  default: { findOne: vi.fn() }
}));

vi.mock('@/lib/marketplace/serializers', () => {
  return {
    serializeCategory: (doc: any) => doc
  };
});

// Import after mocks
let GET: any;
let resolveMarketplaceContext: any;
let findProductBySlug: any;
let Category: any;

beforeAll(async () => {
  ({ GET } = await import('../../../../app/api/marketplace/products/[slug]/route'));
  ({ resolveMarketplaceContext } = await import('@/lib/marketplace/context'));
  ({ findProductBySlug } = await import('@/lib/marketplace/search'));
  const CategoryMod = await import('@/server/models/marketplace/Category');
  Category = CategoryMod.default;
});

describe('API GET /marketplace/products/[slug] (current implementation)', () => {
  const callGET = async (slug: string) => {
    const req = {} as unknown as NextRequest;
    return await GET(req, { params: { slug } });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resolveMarketplaceContext.mockResolvedValue({ orgId: 'org1', tenantKey: 'demo-tenant' });
    Category.findOne.mockResolvedValue(null);
  });

  it('returns 404 when product is not found', async () => {
    findProductBySlug.mockResolvedValueOnce(null);

    const res: any = await callGET('unknown-slug');

    expect(res).toEqual({
      type: 'NextResponseMock',
      status: 404,
      body: { ok: false, error: 'Product not found' }
    });
  });

  it('returns ok=true with product and null category (happy path)', async () => {
    const product = { _id: 'p1', slug: 'toy', categoryId: 'c1' };
    findProductBySlug.mockResolvedValueOnce(product);
    Category.findOne.mockResolvedValueOnce(null);

    const res: any = await callGET('toy');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.product).toEqual(product);
    expect(res.body.data.category).toBeNull();
  });
});

