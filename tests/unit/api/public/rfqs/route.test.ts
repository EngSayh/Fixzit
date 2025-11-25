/**
 * Tests for app/api/public/rfqs/route.ts GET handler
 *
 * Testing library/framework note:
 * - This test suite is designed for Jest (common in Next.js TypeScript repos).
 * - If the project uses Vitest, the suite should largely be compatible since it uses describe/it/expect patterns.
 */

import { NextRequest } from 'next/server';
import { vi } from 'vitest';

// Module under test: we import the GET handler from the route module sitting next to this test file.
// If your route file name differs (e.g., route.ts), adjust the import accordingly.

import { GET } from '@/app/api/public/rfqs/route';

// Mocks: db and RFQ model
// We mock the db to avoid real connections, and RFQ model methods used in the handler:
// - RFQ.find(...).sort(...).skip(...).limit(...).lean()
// - RFQ.countDocuments(...)
vi.mock('@/lib/mongo', () => ({
  db: Promise.resolve()
}));

// 🔒 TYPE SAFETY: Using Record<string, unknown> for RFQ documents
type RFQDoc = Record<string, unknown>;

// 🔒 TYPE SAFETY: Mock find chain with proper typing
const findExecChain = () => {
  // Build a chainable mock for Mongoose-like query:
  const chain = {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn()
  };
  return chain;
};

const mockFindChain = findExecChain();

const RFQMock = {
  find: vi.fn(() => mockFindChain),
  countDocuments: vi.fn()
};

vi.mock('@/server/models/RFQ', () => ({
  RFQ: RFQMock
}));

// Utility to build a NextRequest with URL and query params
const makeRequest = (params: Record<string, string | number | undefined> = {}) => {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) usp.set(k, String(v));
  }
  const url = `https://example.test/api/public/rfqs?${usp.toString()}`;
  return new NextRequest(url);
};

// Helper to extract JSON from NextResponse
const readJson = async (res: { json: () => Promise<unknown> }) => {
  // next/server NextResponse.json returns a NextResponse-like object with a json() method
  // In Jest environment, the body can be read via res.json()
  return await res.json();
};

describe('GET /api/public/rfqs', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...OLD_ENV };
    delete process.env.NEXT_PUBLIC_MARKETPLACE_TENANT;

    // Reset chain methods for each test
    (mockFindChain.sort as ReturnType<typeof vi.fn>).mockReturnValue(mockFindChain);
    (mockFindChain.skip as ReturnType<typeof vi.fn>).mockReturnValue(mockFindChain);
    (mockFindChain.limit as ReturnType<typeof vi.fn>).mockReturnValue(mockFindChain);
    (mockFindChain.lean as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    RFQMock.countDocuments.mockResolvedValue(0);
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('returns empty list with defaults when no params provided', async () => {
    const req = makeRequest({});
    const res = await GET(req);
    const json = await readJson(res);

    // ok response
    expect(json.ok).toBe(true);
    expect(json.data.items).toEqual([]);

    // pagination defaults: page=1, limit=12, total=0, pages=0
    expect(json.data.pagination.page).toBe(1);
    expect(json.data.pagination.limit).toBe(12);
    expect(json.data.pagination.total).toBe(0);
    expect(json.data.pagination.pages).toBe(0);

    // tenant: defaults to 'demo-tenant' when env var unset
    expect(json.data.pagination.tenantId).toBe('demo-tenant');

    // filter used: status in ['PUBLISHED','BIDDING']
    expect(RFQMock.find).toHaveBeenCalledWith({
      tenantId: 'demo-tenant',
      status: { $in: ['PUBLISHED', 'BIDDING'] }
    });

    // sorted by createdAt desc, skip 0, limit 12
    expect(mockFindChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(mockFindChain.skip).toHaveBeenCalledWith(0);
    expect(mockFindChain.limit).toHaveBeenCalledWith(12);
    expect(mockFindChain.lean).toHaveBeenCalledTimes(1);
    expect(RFQMock.countDocuments).toHaveBeenCalledWith({
      tenantId: 'demo-tenant',
      status: { $in: ['PUBLISHED', 'BIDDING'] }
    });
  });

  it('applies tenantId from env when not provided in query', async () => {
    process.env.NEXT_PUBLIC_MARKETPLACE_TENANT = 'env-tenant';
    const req = makeRequest({});
    await GET(req);
    expect(RFQMock.find).toHaveBeenCalledWith({
      tenantId: 'env-tenant',
      status: { $in: ['PUBLISHED', 'BIDDING'] }
    });
  });

  it('respects tenantId in query over env default', async () => {
    process.env.NEXT_PUBLIC_MARKETPLACE_TENANT = 'env-tenant';
    const req = makeRequest({ tenantId: 'query-tenant' });
    await GET(req);
    expect(RFQMock.find).toHaveBeenCalledWith({
      tenantId: 'query-tenant',
      status: { $in: ['PUBLISHED', 'BIDDING'] }
    });
  });

  it('supports explicit status filter (overrides default statuses)', async () => {
    const req = makeRequest({ status: 'CLOSED' });
    await GET(req);
    expect(RFQMock.find).toHaveBeenCalledWith({
      tenantId: 'demo-tenant',
      status: 'CLOSED'
    });
  });

  it('applies category and city filters and full-text search', async () => {
    const req = makeRequest({
      category: 'construction',
      city: 'Riyadh',
      search: 'steel beams'
    });
    await GET(req);
    expect(RFQMock.find).toHaveBeenCalledWith({
      tenantId: 'demo-tenant',
      status: { $in: ['PUBLISHED', 'BIDDING'] },
      category: 'construction',
      'location.city': 'Riyadh',
      $text: { $search: 'steel beams' }
    });
  });

  it('computes pagination with provided page and limit within allowed range', async () => {
    const req = makeRequest({ page: 3, limit: 10 });
    RFQMock.countDocuments.mockResolvedValue(95);
    await GET(req);

    // skip = (3-1)*10 = 20
    expect(mockFindChain.skip).toHaveBeenCalledWith(20);
    expect(mockFindChain.limit).toHaveBeenCalledWith(10);
  });

  it('clamps page to at least 1 when page is 0 or negative', async () => {
    const req = makeRequest({ page: 0 });
    await GET(req);
    // page becomes 1 -> skip 0
    expect(mockFindChain.skip).toHaveBeenCalledWith(0);
  });

  it('returns 400 on invalid query (limit > 50)', async () => {
    const req = makeRequest({ limit: 51 });
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await readJson(res);
    expect(json.error).toBe('Invalid query parameters');
    expect(Array.isArray(json.details)).toBe(true);
  });

  it('normalizes returned items including null defaults and ISO date conversion', async () => {
    const now = new Date('2023-01-02T03:04:05.000Z');
    const sample: RFQDoc = {
      _id: { toString: () => 'abc123' },
      tenantId: 'demo-tenant',
      code: 'RFQ-001',
      title: 'Supply widgets',
      description: 'Need 100 widgets',
      category: 'manufacturing',
      subcategory: undefined, // should become null
      status: 'PUBLISHED',
      location: {
        city: 'Jeddah',
        region: undefined, // null
        radius: undefined // null
      },
      budget: {
        estimated: 5000,
        currency: undefined, // default 'SAR'
        range: undefined // null
      },
      timeline: {
        publishDate: now,
        bidDeadline: '2023-02-01', // string convertible to date
        startDate: null, // becomes null
        completionDate: 'invalid-date' // becomes null
      },
      bidding: {
        targetBids: undefined, // default 0
        maxBids: undefined, // null
        anonymous: undefined, // true
        bidLeveling: undefined // false
      },
      requirements: ['ISO9001'],
      bids: [{}, {}, {}],
      createdAt: now,
      updatedAt: '2023-01-03T11:22:33.000Z'
    };

    (mockFindChain.lean as ReturnType<typeof vi.fn>).mockResolvedValue([sample]);
    RFQMock.countDocuments.mockResolvedValue(1);

    const req = makeRequest({});
    const res = await GET(req);
    const json = await readJson(res);

    expect(json.ok).toBe(true);
    expect(json.data.items).toHaveLength(1);
    const item = json.data.items[0];

    expect(item.id).toBe('abc123');
    expect(item.tenantId).toBe('demo-tenant');
    expect(item.code).toBe('RFQ-001');
    expect(item.title).toBe('Supply widgets');
    expect(item.description).toBe('Need 100 widgets');
    expect(item.category).toBe('manufacturing');
    expect(item.subcategory).toBeNull();
    expect(item.status).toBe('PUBLISHED');

    expect(item.location).toEqual({
      city: 'Jeddah',
      region: null,
      radius: null
    });

    expect(item.budget).toEqual({
      estimated: 5000,
      currency: 'SAR',
      range: null
    });

    expect(item.timeline).toEqual({
      publishDate: '2023-01-02T03:04:05.000Z',
      bidDeadline: new Date('2023-02-01').toISOString(),
      startDate: null,
      completionDate: null
    });

    expect(item.bidding).toEqual({
      targetBids: 0,
      maxBids: null,
      anonymous: true,
      bidLeveling: false
    });

    expect(item.requirements).toEqual(['ISO9001']);
    expect(item.bidsCount).toBe(3);
    expect(item.createdAt).toBe('2023-01-02T03:04:05.000Z');
    expect(item.updatedAt).toBe('2023-01-03T11:22:33.000Z');

    // pagination reflects total=1, pages=ceil(1/12)=1
    expect(json.data.pagination.total).toBe(1);
    expect(json.data.pagination.pages).toBe(1);
  });

  it('handles items with missing nested objects gracefully (location/budget/timeline/bidding null)', async () => {
    const sample: RFQDoc = {
      _id: 'rawid-789',
      tenantId: 'demo-tenant',
      code: 'RFQ-RAW',
      title: 'No nested',
      description: 'Minimal fields',
      category: 'general',
      status: 'BIDDING',
      requirements: null,
      bids: undefined,
      createdAt: '2023-04-01T00:00:00.000Z',
      updatedAt: undefined
    };

    (mockFindChain.lean as ReturnType<typeof vi.fn>).mockResolvedValue([sample]);
    RFQMock.countDocuments.mockResolvedValue(1);

    const req = makeRequest({});
    const res = await GET(req);
    const json = await readJson(res);

    expect(json.ok).toBe(true);
    const item = json.data.items[0];
    expect(item.id).toBe('rawid-789');
    expect(item.location).toBeNull();
    expect(item.budget).toBeNull();
    expect(item.timeline).toBeNull();
    expect(item.bidding).toBeNull();
    expect(item.requirements).toBeNull();
    expect(item.bidsCount).toBe(0);
    expect(typeof item.createdAt).toBe('string'); // ISO or null-like was converted
    expect(item.updatedAt).toBeNull();
  });

  it('returns 500 on unexpected errors', async () => {
    (mockFindChain.lean as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db down'));

    const req = makeRequest({});
    const res = await GET(req);
    expect(res.status).toBe(500);
    const json = await readJson(res);
    expect(json.error).toBe('Internal server error');
  });
});
