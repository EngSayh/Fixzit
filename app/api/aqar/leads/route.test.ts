/**
 * Tests for app/api/aqar/leads/route.ts
 * Testing library/framework: Jest (TypeScript via ts-jest or equivalent)
 * - We mock DB connection and Mongoose model methods.
 * - We stub minimal NextRequest-like objects since handlers only use headers, url, and json().
 */

import { GET, PUT } from './route';

jest.mock('@/src/db/mongoose', () => ({
  dbConnect: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/src/server/models/AqarLead', () => ({
  AqarLead: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

const { dbConnect } = require('@/src/db/mongoose');
const { AqarLead } = require('@/src/server/models/AqarLead');

type HeadersLike = {
  get: (key: string) => string | null;
};

function makeHeaders(map: Record<string, string | undefined> = {}): HeadersLike {
  const normalized = Object.fromEntries(
    Object.entries(map).map(([k, v]) => [k.toLowerCase(), v ?? null])
  );
  return {
    get: (key: string) => {
      const v = normalized[key.toLowerCase()];
      return (v as string) ?? null;
    },
  };
}

function makeGetReq(url: string, headers: Record<string, string | undefined> = {}) {
  return {
    url,
    headers: makeHeaders(headers),
  } as any;
}

function makePutReq(url: string, body: unknown, headers: Record<string, string | undefined> = {}) {
  return {
    url,
    headers: makeHeaders(headers),
    json: jest.fn().mockResolvedValue(body),
  } as any;
}

function chainForFind(leads: any[], capture: { skip?: number; limit?: number; sort?: any } = {}) {
  // Build chainable query mock for GET: find(...).populate().populate().sort().skip().limit().lean()
  const chain: any = {
    populate: jest.fn().mockImplementation(() => chain),
    sort: jest.fn().mockImplementation((arg: any) => {
      capture.sort = arg;
      return chain;
    }),
    skip: jest.fn().mockImplementation((n: number) => {
      capture.skip = n;
      return chain;
    }),
    limit: jest.fn().mockImplementation((n: number) => {
      capture.limit = n;
      return {
        lean: jest.fn().mockResolvedValue(leads),
      };
    }),
  };
  // populate called twice, so return same chain
  return chain;
}

function chainForFindOneAndUpdate(result: any) {
  // Build chainable query mock for PUT: findOneAndUpdate(...).populate(...).populate(...)
  const afterFirstPopulate = { populate: jest.fn().mockResolvedValue(result) };
  const chain: any = {
    populate: jest.fn().mockReturnValue(afterFirstPopulate),
  };
  return chain;
}

describe('app/api/aqar/leads/route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    test('returns leads with default pagination and tenant header defaults', async () => {
      const leads = [{ _id: 'l1' }, { _id: 'l2' }];
      const capture: any = {};
      (AqarLead.find as jest.Mock).mockImplementation(() => chainForFind(leads, capture));
      (AqarLead.countDocuments as jest.Mock).mockResolvedValue(42);

      const req = makeGetReq('https://example.com/api/aqar/leads', {}); // no headers -> defaults
      const res = await GET(req);
      expect(dbConnect).toHaveBeenCalled();

      // NextResponse.json returns a Response; parse JSON
      const json = await (res as Response).json();
      expect(json.success).toBe(true);
      expect(json.data.leads).toEqual(leads);
      expect(json.data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 42,
        pages: Math.ceil(42 / 20),
      });

      // Verify skip/limit calculations: page=1, limit=20 -> skip 0, limit 20
      expect(capture.skip).toBe(0);
      expect(capture.limit).toBe(20);
      // Verify sort used
      expect(capture.sort).toEqual({ createdAt: -1 });

      // Verify count called with tenant query default
      expect(AqarLead.countDocuments).toHaveBeenCalledWith({ tenantId: 'default' });
    });

    test('applies status and assignedTo filters and custom pagination', async () => {
      const leads = [{ _id: 'a' }];
      const capture: any = {};
      (AqarLead.find as jest.Mock).mockImplementation((query: any) => {
        // Ensure query contains tenantId + filters
        expect(query).toMatchObject({
          tenantId: 't-1',
          status: 'contacted',
          assignedTo: 'user-123',
        });
        return chainForFind(leads, capture);
      });
      (AqarLead.countDocuments as jest.Mock).mockResolvedValue(5);

      const url =
        'https://example.com/api/aqar/leads?page=3&limit=10&status=contacted&assignedTo=user-123';
      const req = makeGetReq(url, { 'x-tenant-id': 't-1', 'x-user-id': 'u-9' });
      const res = await GET(req);
      const json = await (res as Response).json();

      expect(json.success).toBe(true);
      expect(json.data.leads).toEqual(leads);
      expect(json.data.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 5,
        pages: Math.ceil(5 / 10),
      });

      // page=3, limit=10 -> skip 20
      expect(capture.skip).toBe(20);
      expect(capture.limit).toBe(10);
    });

    test('handles unexpected errors with 500', async () => {
      (AqarLead.find as jest.Mock).mockImplementation(() => ({
        populate: () => ({
          populate: () => ({
            sort: () => ({
              skip: () => ({
                limit: () => ({
                  lean: jest.fn().mockRejectedValue(new Error('boom')),
                }),
              }),
            }),
          }),
        }),
      }));
      (AqarLead.countDocuments as jest.Mock).mockResolvedValue(0);

      const req = makeGetReq('https://example.com/api/aqar/leads');
      const res = await GET(req);
      expect((res as Response).status).toBe(500);
      const json = await (res as Response).json();
      expect(json).toEqual({ success: false, error: 'Failed to fetch leads' });
    });
  });

  describe('PUT', () => {
    test('returns 400 when id is missing', async () => {
      const req = makePutReq('https://example.com/api/aqar/leads', {});
      const res = await PUT(req);
      expect((res as Response).status).toBe(400);
      const json = await (res as Response).json();
      expect(json).toEqual({ success: false, error: 'Lead ID is required' });
      expect(AqarLead.findOneAndUpdate).not.toHaveBeenCalled();
    });

    test('validates payload with Zod and returns 400 on invalid status', async () => {
      const req = makePutReq(
        'https://example.com/api/aqar/leads?id=abc123',
        { status: 'invalid-status' } // not in enum
      );
      const res = await PUT(req);
      expect((res as Response).status).toBe(400);
      const json = await (res as Response).json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Validation error');
      expect(Array.isArray(json.details)).toBe(true);
    });

    test('updates lead successfully and maps fields correctly', async () => {
      const nowIso = new Date().toISOString();
      const updatedLead = {
        _id: 'abc123',
        status: 'qualified',
        assignedTo: 'user-456',
        nextFollowUp: nowIso, // final returned value can be string from model mock
        updatedBy: 'user-99',
      };

      // Capture the arguments passed to findOneAndUpdate
      let capturedQuery: any;
      let capturedUpdate: any;
      (AqarLead.findOneAndUpdate as jest.Mock).mockImplementation((q: any, u: any, _opts: any) => {
        capturedQuery = q;
        capturedUpdate = u;
        return chainForFindOneAndUpdate(updatedLead);
      });

      const body = {
        status: 'qualified',
        assignedTo: 'user-456',
        nextFollowUp: nowIso,
        priority: 'high',
        notes: [{ text: 'note1', createdBy: 'user-99' }],
      };
      const req = makePutReq(
        'https://example.com/api/aqar/leads?id=abc123',
        body,
        { 'x-tenant-id': 'tenant-1', 'x-user-id': 'user-99' }
      );

      const res = await PUT(req);
      expect((res as Response).status).toBe(200);
      const json = await (res as Response).json();

      expect(json.success).toBe(true);
      expect(json.data).toEqual(updatedLead);

      // Query must include tenant and id
      expect(capturedQuery).toEqual({ _id: 'abc123', tenantId: 'tenant-1' });

      // updatedBy set from header
      expect(capturedUpdate.updatedBy).toBe('user-99');
      // assignedAt added when assignedTo present (Date instance)
      expect(capturedUpdate.assignedAt instanceof Date).toBe(true);
      // nextFollowUp converted to Date instance
      expect(capturedUpdate.nextFollowUp instanceof Date).toBe(true);
      // Original validated fields preserved
      expect(capturedUpdate.status).toBe('qualified');
      expect(capturedUpdate.priority).toBe('high');
      expect(capturedUpdate.notes).toEqual([{ text: 'note1', createdBy: 'user-99' }]);
    });

    test('returns 404 when lead not found', async () => {
      (AqarLead.findOneAndUpdate as jest.Mock).mockImplementation(() =>
        // Chain leads to final null result
        ({
          populate: () => ({
            populate: () => Promise.resolve(null),
          }),
        })
      );

      const req = makePutReq(
        'https://example.com/api/aqar/leads?id=missing',
        { status: 'new' },
        { 'x-tenant-id': 'tenant-2', 'x-user-id': 'u' }
      );
      const res = await PUT(req);
      expect((res as Response).status).toBe(404);
      const json = await (res as Response).json();
      expect(json).toEqual({ success: false, error: 'Lead not found' });
    });

    test('handles unexpected errors with 500', async () => {
      (AqarLead.findOneAndUpdate as jest.Mock).mockImplementation(() => {
        throw new Error('db down');
      });
      const req = makePutReq(
        'https://example.com/api/aqar/leads?id=abc',
        { status: 'new' },
        {}
      );
      const res = await PUT(req);
      expect((res as Response).status).toBe(500);
      const json = await (res as Response).json();
      expect(json).toEqual({ success: false, error: 'Failed to update lead' });
    });
  });
});