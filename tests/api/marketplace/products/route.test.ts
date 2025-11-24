import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import type { Mock } from 'vitest';

vi.mock('next/server', () => {
  return {
    NextResponse: {
      json: (body: ResponseBody, init?: ResponseInit): JsonResponse => ({
        type: 'NextResponseMock',
        status: init?.status ?? 200,
        body
      })
    },
    NextRequest: class {},
  };
});

const mockFindOne: Mock = vi.fn();
vi.mock('@/server/models/MarketplaceProduct', () => ({
  MarketplaceProduct: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
  },
}));

import { GET } from '@/app/api/marketplace/products/[slug]/route';

type Context = {
  params: { slug: string };
};
type ProductDoc = {
  _id: string;
  slug: string;
  prices: { listPrice: number; currency: string }[];
  inventories: { onHand: number; leadDays: number }[];
};
type ResponseBody =
  | { ok: false; error: string }
  | {
      ok: true;
      data: { product: ProductDoc };
      product: ProductDoc;
      buyBox: { price: number; currency: string; inStock: boolean; leadDays: number };
    };
type JsonResponse = { type: 'NextResponseMock'; status: number; body: ResponseBody };

const callGET = async (slug: string): Promise<JsonResponse> => {
  const req = { headers: new Headers(), nextUrl: { protocol: 'https:' } } as unknown as NextRequest;
  return await GET(req, { params: { slug } } as Context);
};

describe('API GET /marketplace/products/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_MARKETPLACE_TENANT;
  });

  it('returns 404 payload when product missing', async () => {
    mockFindOne.mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue(null),
    });

    const res = await callGET('missing');
    expect(mockFindOne).toHaveBeenCalledWith({
      tenantId: 'demo-tenant',
      slug: 'missing',
    });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ ok: false, error: 'Product not found' });
  });

  it('returns ok payload with computed buy box when product exists', async () => {
    const doc = {
      _id: 'abc',
      slug: 'toy',
      prices: [{ listPrice: 100, currency: 'USD' }],
      inventories: [{ onHand: 5, leadDays: 4 }],
    };
    mockFindOne.mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue(doc),
    });

    const res = await callGET('toy');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.product).toEqual(doc);
    expect(res.body.product).toEqual(doc);
    expect(res.body.buyBox).toEqual({
      price: 100,
      currency: 'USD',
      inStock: true,
      leadDays: 4,
    });
  });
});
