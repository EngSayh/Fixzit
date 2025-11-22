import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mockSouqListing = vi.hoisted(() => ({
  find: vi.fn(),
}));

const mockSouqOrder = vi.hoisted(() => ({
  create: vi.fn(),
  find: vi.fn(),
  countDocuments: vi.fn(),
}));

vi.mock('@/lib/mongodb-unified', () => ({
  connectDb: vi.fn(),
}));

vi.mock('@/server/models/souq/Listing', () => ({
  SouqListing: mockSouqListing,
}));

vi.mock('@/server/models/souq/Order', () => ({
  SouqOrder: mockSouqOrder,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

let currentSession: Record<string, unknown> | null = null;
vi.mock('@/auth', () => ({
  auth: vi.fn(async () => currentSession),
}));

import { SouqListing } from '@/server/models/souq/Listing';
import { SouqOrder } from '@/server/models/souq/Order';

let POST: typeof import('@/app/api/souq/orders/route').POST;
let GET: typeof import('@/app/api/souq/orders/route').GET;

const CUSTOMER_ID_HEX = '507f1f77bcf86cd799439011';
const LISTING_ID_HEX = '507f1f77bcf86cd799439012';
const SELLER_ID_HEX = '507f1f77bcf86cd799439013';
const OTHER_SELLER_ID_HEX = '507f1f77bcf86cd799439014';

const createListingFindResult = (items: unknown[]) => ({
  populate: vi.fn().mockResolvedValue(items),
});

describe('/api/souq/orders', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    (SouqListing.find as vi.Mock).mockReturnValue(createListingFindResult([]));
    (SouqOrder.create as vi.Mock).mockResolvedValue({});
    (SouqOrder.find as vi.Mock).mockResolvedValue([]);
    (SouqOrder.countDocuments as vi.Mock).mockResolvedValue(0);
    currentSession = null;

    const mod = await import('@/app/api/souq/orders/route');
    POST = mod.POST;
    GET = mod.GET;
  });

  it('rejects requests when auth is missing', async () => {
    currentSession = null;
    const res = await POST(createRequest({}));
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error).toBe('unauthorized');
  });

  it('rejects order creation for other sellers', async () => {
    currentSession = { user: { id: 'user', orgId: SELLER_ID_HEX } };
    const listing = buildListing({ _id: LISTING_ID_HEX, sellerId: OTHER_SELLER_ID_HEX, availableQuantity: 10 });
    (SouqListing.find as vi.Mock).mockReturnValue(createListingFindResult([listing]));

    const res = await POST(
      createRequest({
        customerId: CUSTOMER_ID_HEX,
        customerEmail: 'a@b.com',
        customerPhone: '0500000000',
        items: [{ listingId: LISTING_ID_HEX, quantity: 1 }],
        shippingAddress: buildAddress(),
        paymentMethod: 'card',
    })
    );
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error).toBe('forbidden');
  });

  it('returns conflict when stock unavailable', async () => {
    currentSession = { user: { id: 'user', orgId: SELLER_ID_HEX } };
    const listing = buildListing({ _id: LISTING_ID_HEX, sellerId: SELLER_ID_HEX, availableQuantity: 1 });
    (SouqListing.find as vi.Mock).mockReturnValue(createListingFindResult([listing]));
    const res = await POST(
      createRequest({
        customerId: CUSTOMER_ID_HEX,
        customerEmail: 'a@b.com',
        customerPhone: '0500000000',
        items: [{ listingId: LISTING_ID_HEX, quantity: 2 }],
        shippingAddress: buildAddress(),
        paymentMethod: 'card',
      })
    );
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error).toBe('conflict');
  });

  it('creates an order when data is valid', async () => {
    currentSession = { user: { id: 'user', orgId: SELLER_ID_HEX } };
    const listing = buildListing({
      _id: LISTING_ID_HEX,
      sellerId: SELLER_ID_HEX,
      price: 100,
      availableQuantity: 5,
    });
    (SouqListing.find as vi.Mock).mockReturnValue(createListingFindResult([listing]));
    (SouqOrder.create as vi.Mock).mockResolvedValue({ orderId: 'ORD-1' });

    const res = await POST(
      createRequest({
        customerId: CUSTOMER_ID_HEX,
        customerEmail: 'a@b.com',
        customerPhone: '0500000000',
        items: [{ listingId: LISTING_ID_HEX, quantity: 1 }],
        shippingAddress: buildAddress(),
        paymentMethod: 'card',
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(SouqOrder.create).toHaveBeenCalled();
  });

  it('enforces seller org on GET even when query overrides', async () => {
    currentSession = { user: { id: 'user', orgId: SELLER_ID_HEX } };
    (SouqOrder.find as vi.Mock).mockResolvedValue([{ orderId: 'ORD-1' }]);
    (SouqOrder.countDocuments as vi.Mock).mockResolvedValue(1);

    const req = createRequest({}, { sellerId: OTHER_SELLER_ID_HEX });
    const res = await GET(req as NextRequest);
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error).toBe('forbidden');
  });
});

function buildListing(overrides: Record<string, unknown>) {
  return {
    _id: overrides._id,
    listingId: overrides._id,
    sellerId: overrides.sellerId,
    price: overrides.price ?? 50,
    availableQuantity: overrides.availableQuantity ?? 10,
    reservedQuantity: 0,
    fulfillmentMethod: 'delivery',
    fsin: 'FSIN',
    productId: 'prod',
    reserveStock: overrides.reserveStock,
    save: vi.fn().mockResolvedValue(undefined),
  };
}

function buildAddress() {
  return {
    name: 'Test',
    phone: '0501234567',
    addressLine1: 'Line 1',
    city: 'Riyadh',
    country: 'SA',
    postalCode: '12345',
  };
}

function createRequest(body: Record<string, unknown>, queryParams: Record<string, string> = {}) {
  const url = new URL('https://fixzit.test/api/souq/orders');
  Object.entries(queryParams).forEach(([key, value]) => url.searchParams.set(key, value));
  return {
    url: url.toString(),
    nextUrl: url,
    headers: new Headers(),
    json: async () => body,
  } as Partial<NextRequest> & { json: () => Promise<Record<string, unknown>> };
}
