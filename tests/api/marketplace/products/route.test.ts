// Tests for GET handler in API route
// Framework: Jest-style (describe/it/expect/jest.fn). If using Vitest, replace jest.fn/mock with vi.fn/mock accordingly.

// We are testing the code in the diff which exports GET and imports NextRequest/NextResponse and MarketplaceProduct
// The file under test content (for reference) computes buyBox fields and returns NextResponse.json.

import type { NextRequest } from 'next/server';

// Mock next/server to control NextResponse.json behavior
jest.mock('next/server', () => {
  return {
    // Minimal stub for NextRequest type usage; not used by implementation
    NextRequest: class {},
    NextResponse: {
      json: (body: any, init?: ResponseInit) => {
        // Return a simple plain object to assert in tests
        return {
          type: 'NextResponseMock',
          status: init?.status ?? 200,
          body
        };
      }
    }
  };
});

// Mock the MarketplaceProduct model
jest.mock('@/src/server/models/MarketplaceProduct', () => {
  return {
    MarketplaceProduct: {
      findOne: jest.fn()
    }
  };
});

import { GET } from '../../../../1:/api/admin/benchmarks/route.ts'; // Will be replaced below
import { MarketplaceProduct } from '@/src/server/models/MarketplaceProduct';

describe('API GET /marketplace/products/[slug]', () => {
  const mockFindOne = (MarketplaceProduct as any).findOne as jest.Mock;

  const callGET = async (slug: string) => {
    // We don't use the request within the handler, but provide a minimal stub
    const req = {} as unknown as NextRequest;
    return await GET(req, { params: { slug } });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when product is not found', async () => {
    mockFindOne.mockResolvedValueOnce(null);

    const res: any = await callGET('unknown-slug');

    expect(mockFindOne).toHaveBeenCalledWith({ tenantId: 'demo-tenant', slug: 'unknown-slug' });
    expect(res).toEqual({
      type: 'NextResponseMock',
      status: 404,
      body: { error: 'Not found' }
    });
  });

  it('returns 200 and product with buyBox computed (happy path)', async () => {
    const doc = {
      _id: 'id1',
      slug: 'toy',
      prices: [{ listPrice: 123.45, currency: 'USD' }],
      inventories: [{ onHand: 7, leadDays: 10 }]
    };
    mockFindOne.mockResolvedValueOnce(doc);

    const res: any = await callGET('toy');

    expect(mockFindOne).toHaveBeenCalledWith({ tenantId: 'demo-tenant', slug: 'toy' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      product: doc,
      buyBox: {
        price: 123.45,
        currency: 'USD',
        inStock: true,
        leadDays: 10
      }
    });
  });

  it('defaults currency to SAR when missing', async () => {
    const doc = {
      slug: 'no-currency',
      prices: [{ listPrice: 50 }], // currency missing
      inventories: [{ onHand: 1, leadDays: 5 }]
    };
    mockFindOne.mockResolvedValueOnce(doc);

    const res: any = await callGET('no-currency');

    expect(res.status).toBe(200);
    expect(res.body.buyBox).toEqual({
      price: 50,
      currency: 'SAR',
      inStock: true,
      leadDays: 5
    });
  });

  it('sets price null when price missing', async () => {
    const doc = {
      slug: 'no-price',
      prices: [{}], // listPrice missing
      inventories: [{ onHand: 2, leadDays: 4 }]
    };
    mockFindOne.mockResolvedValueOnce(doc);

    const res: any = await callGET('no-price');

    expect(res.status).toBe(200);
    expect(res.body.buyBox.price).toBeNull();
  });

  it('inStock is false when onHand is 0, undefined, or negative', async () => {
    const cases = [
      { inventories: [{ onHand: 0, leadDays: 2 }], expected: false },
      { inventories: [{}], expected: false },
      { inventories: [{ onHand: -3 }], expected: false }
    ];

    for (const [index, c] of cases.entries()) {
      const doc = { slug: 'stock-case-' + index, prices: [{ listPrice: 10, currency: 'EUR' }], ...c };
      mockFindOne.mockResolvedValueOnce(doc);

      const res: any = await callGET('stock-case-' + index);

      expect(res.status).toBe(200);
      expect(res.body.buyBox.inStock).toBe(c.expected);
    }
  });

  it('defaults leadDays to 3 when not provided', async () => {
    const doc = {
      slug: 'no-lead',
      prices: [{ listPrice: 15, currency: 'GBP' }],
      inventories: [{}] // leadDays missing
    };
    mockFindOne.mockResolvedValueOnce(doc);

    const res: any = await callGET('no-lead');

    expect(res.status).toBe(200);
    expect(res.body.buyBox.leadDays).toBe(3);
  });

  it('handles missing prices and inventories arrays gracefully', async () => {
    const doc = {
      slug: 'missing-arrays'
      // prices and inventories entirely absent
    } as any;
    mockFindOne.mockResolvedValueOnce(doc);

    const res: any = await callGET('missing-arrays');

    expect(res.status).toBe(200);
    expect(res.body.buyBox).toEqual({
      price: null,
      currency: 'SAR',
      inStock: false,
      leadDays: 3
    });
  });

  it('returns 500 when an error is thrown and logs the error', async () => {
    const err = new Error('DB down');
    mockFindOne.mockRejectedValueOnce(err);

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res: any = await callGET('boom');

    expect(res).toEqual({
      type: 'NextResponseMock',
      status: 500,
      body: { error: 'Server error' }
    });
    expect(errorSpy).toHaveBeenCalled();
    // First arg should include the tag message 'pdp error'
    const firstCallArgs = errorSpy.mock.calls[0] || [];
    expect(String(firstCallArgs[0] ?? '')).toContain('pdp error');

    errorSpy.mockRestore();
  });
});