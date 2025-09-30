// Tests for GET handler in API route (marketplace products by slug)
// Framework: Jest-style

import type { NextRequest } from 'next/server';

// Mock next/server to control NextResponse.json behavior
jest.mock('next/server', () => {
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
jest.mock('@/lib/marketplace/context', () => {
  return {
    resolveMarketplaceContext: jest.fn()
  };
});

jest.mock('@/lib/marketplace/search', () => {
  return {
    findProductBySlug: jest.fn()
  };
});

jest.mock('@/db/mongoose', () => {
  return {
    dbConnect: jest.fn()
  };
});

jest.mock('@/models/marketplace/Category', () => ({
  __esModule: true,
  default: { findOne: jest.fn() }
}));

jest.mock('@/lib/marketplace/serializers', () => {
  return {
    serializeCategory: (doc: any) => doc
  };
});

import { GET } from '../../../../app/api/marketplace/products/[slug]/route';

const { resolveMarketplaceContext } = jest.requireMock('@/lib/marketplace/context');
const { findProductBySlug } = jest.requireMock('@/lib/marketplace/search');
const CategoryMod = jest.requireMock('@/models/marketplace/Category');

describe('API GET /marketplace/products/[slug] (current implementation)', () => {
  const callGET = async (slug: string) => {
    const req = {} as unknown as NextRequest;
    return await GET(req, { params: { slug } });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (resolveMarketplaceContext as jest.Mock).mockResolvedValue({ orgId: 'org1', tenantKey: 'demo-tenant' });
    CategoryMod.default.findOne.mockResolvedValue(null);
  });

  it('returns 404 when product is not found', async () => {
    (findProductBySlug as jest.Mock).mockResolvedValueOnce(null);

    const res: any = await callGET('unknown-slug');

    expect(res).toEqual({
      type: 'NextResponseMock',
      status: 404,
      body: { ok: false, error: 'Product not found' }
    });
  });

  it('returns ok=true with product and null category (happy path)', async () => {
    const product = { _id: 'p1', slug: 'toy', categoryId: 'c1' };
    (findProductBySlug as jest.Mock).mockResolvedValueOnce(product);
    CategoryMod.default.findOne.mockResolvedValueOnce(null);

    const res: any = await callGET('toy');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.product).toEqual(product);
    expect(res.body.data.category).toBeNull();
  });
});

