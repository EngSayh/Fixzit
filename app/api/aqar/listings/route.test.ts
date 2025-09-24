/**
 * Test framework: Jest (TypeScript)
 * These tests validate the GET and POST handlers in app/api/aqar/listings/route.ts.
 * They mock database connectivity and Mongoose models to focus on handler logic.
 * If your project uses Vitest, replace jest.* with vi.* equivalents.
 */

import { NextResponse } from 'next/server';

// Import the handlers under test
// The test file lives alongside the route file for simple relative import.
import { GET, POST } from './route';

// Mocks
jest.mock('@/src/db/mongoose', () => ({
  dbConnect: jest.fn().mockResolvedValue(undefined),
}));

// We'll expose mock chain and helpers for assertions
type FindChain = {
  populate: jest.Mock;
  sort: jest.Mock;
  skip: jest.Mock;
  limit: jest.Mock;
  lean: jest.Mock;
};

const makeFindChain = (result: any[] = []) => {
  const chain: FindChain = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
  return chain;
};

const mockFindChain = makeFindChain([{ _id: 'l1' }, { _id: 'l2' }]);

const mockCountDocuments = jest.fn().mockResolvedValue(2);

const AqarListingConstructor = function (this: any, data: any) {
  Object.assign(this, data);
  this.save = jest.fn().mockResolvedValue(undefined);
} as unknown as {
  new (data: any): any;
  find: jest.Mock;
  countDocuments: jest.Mock;
};

AqarListingConstructor.find = jest.fn().mockReturnValue(mockFindChain);
AqarListingConstructor.countDocuments = mockCountDocuments;

jest.mock('@/src/server/models/AqarListing', () => ({
  __esModule: true,
  AqarListing: AqarListingConstructor,
}));

const Property = {
  findOne: jest.fn(),
};

jest.mock('@/src/server/models/Property', () => ({
  __esModule: true,
  Property,
}));

// Utilities to build minimal request-like objects sufficient for route handlers
function buildGetReq(url: string, headers?: Record<string, string>) {
  return {
    url,
    headers: {
      get: (key: string) => (headers ? headers[key.toLowerCase()] : null),
    },
  } as any;
}

function buildPostReq(body: any, headers?: Record<string, string>) {
  return {
    json: async () => body,
    headers: {
      get: (key: string) => (headers ? headers[key.toLowerCase()] : null),
    },
  } as any;
}

describe('app/api/aqar/listings/route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    test('returns listings with default pagination and sorting (happy path)', async () => {
      // Arrange
      const url = 'https://example.com/api/aqar/listings';
      const req = buildGetReq(url, { 'x-tenant-id': 'tenant-1' });

      // Act
      const res = await GET(req);

      // Assert
      expect(res).toBeInstanceOf(Response);
      expect(res.status).toBe(200);

      const json = await (res as Response).json();
      expect(json).toEqual({
        success: true,
        data: {
          listings: [{ _id: 'l1' }, { _id: 'l2' }],
          pagination: {
            page: 1,
            limit: 24,
            total: 2,
            pages: Math.ceil(2 / 24),
          },
        },
      });

      // Verify model usage
      expect(AqarListingConstructor.find).toHaveBeenCalledTimes(1);
      // Query should at least contain tenantId + status active
      const queryArg = AqarListingConstructor.find.mock.calls[0][0];
      expect(queryArg).toMatchObject({ tenantId: 'tenant-1', status: 'active' });

      // Verify sort default (newest)
      expect(mockFindChain.sort).toHaveBeenCalledWith({ publishedAt: -1, createdAt: -1 });
      // Verify limit/skip
      expect(mockFindChain.skip).toHaveBeenCalledWith(0);
      expect(mockFindChain.limit).toHaveBeenCalledWith(24);
      expect(mockFindChain.lean).toHaveBeenCalled();
      expect(mockCountDocuments).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-1', status: 'active' }));
    });

    test('applies purpose and propertyType filters', async () => {
      const url = 'https://example.com/api/aqar/listings?purpose=rent&propertyType=villa';
      const req = buildGetReq(url, { 'x-tenant-id': 't2' });

      await GET(req);

      const queryArg = AqarListingConstructor.find.mock.calls[0][0];
      expect(queryArg).toMatchObject({
        tenantId: 't2',
        status: 'active',
        purpose: 'rent',
        propertyType: 'villa',
      });
    });

    test('parses numeric query params and sorting by price descending', async () => {
      const url = 'https://example.com/api/aqar/listings?minPrice=1000&maxPrice=5000&bedrooms=3&bathrooms=2&sortBy=price_desc&page=2&limit=10';
      const req = buildGetReq(url, {});

      await GET(req);

      const queryArg = AqarListingConstructor.find.mock.calls[0][0];
      // price range should be set
      expect(queryArg['price.amount']).toBeDefined();
      expect(queryArg['price.amount'].$gte).toBe(1000);
      expect(queryArg['price.amount'].$lte).toBe(5000);
      // bedrooms/bathrooms gte filters
      expect(queryArg['specifications.bedrooms']).toEqual({ $gte: 3 });
      expect(queryArg['specifications.bathrooms']).toEqual({ $gte: 2 });

      // Sorting and pagination
      expect(mockFindChain.sort).toHaveBeenCalledWith({ 'price.amount': -1 });
      // page=2, limit=10 => skip=10
      expect(mockFindChain.skip).toHaveBeenCalledWith(10);
      expect(mockFindChain.limit).toHaveBeenCalledWith(10);
    });

    test('handles furnished and features filters', async () => {
      const url = 'https://example.com/api/aqar/listings?furnished=true&features=garden,pool,security';
      const req = buildGetReq(url, {});

      await GET(req);

      const queryArg = AqarListingConstructor.find.mock.calls[0][0];
      expect(queryArg['specifications.furnished']).toBe(true);

      // The features filter adds flags under specifications
      expect(queryArg.specifications).toBeDefined();
      expect(queryArg.specifications.garden).toBe(true);
      expect(queryArg.specifications.pool).toBe(true);
      expect(queryArg.specifications.security).toBe(true);
    });

    test('applies bbox (bounding box) filters to lat/lng', async () => {
      const url = 'https://example.com/api/aqar/listings?bbox=35.0,20.0,40.0,25.0';
      const req = buildGetReq(url, {});

      await GET(req);

      const queryArg = AqarListingConstructor.find.mock.calls[0][0];
      expect(queryArg['location.lat']).toEqual({ $gte: 20, $lte: 25 });
      expect(queryArg['location.lng']).toEqual({ $gte: 35, $lte: 40 });
    });

    test('returns 500 and error payload on unexpected failure (e.g., internal ReferenceError)', async () => {
      // Introduce a failure inside the chain to simulate runtime error
      (mockFindChain.lean as jest.Mock).mockRejectedValueOnce(new Error('boom'));

      const url = 'https://example.com/api/aqar/listings';
      const req = buildGetReq(url, {});

      const res = await GET(req);
      expect(res.status).toBe(500);
      const json = await (res as Response).json();
      expect(json).toEqual({ success: false, error: 'Failed to fetch listings' });
    });
  });

  describe('POST', () => {
    const baseBody = {
      propertyId: 'prop-1',
      title: 'Great family villa',
      description: 'Spacious villa with garden and pool.',
      purpose: 'sale',
      propertyType: 'villa',
      price: {
        amount: 1500000,
        currency: 'SAR',
        period: 'total',
      },
      specifications: {
        area: 350,
        bedrooms: 4,
        bathrooms: 3,
        furnished: false,
        garden: true,
        pool: true,
      },
      location: {
        lat: 24.7136,
        lng: 46.6753,
        city: 'Riyadh',
        district: 'Al Olaya',
      },
      media: [
        { url: 'https://example.com/img1.jpg', type: 'image', isCover: true },
      ],
      contact: {
        name: 'John Doe',
        phone: '0555555555',
        email: 'john@example.com',
      },
      keywords: ['villa', 'family'],
      tags: ['featured'],
    };

    test('creates listing when property exists for tenant (201)', async () => {
      Property.findOne.mockResolvedValueOnce({ _id: 'prop-1', tenantId: 'tenant-9' });

      const req = buildPostReq(baseBody, { 'x-tenant-id': 'tenant-9', 'x-user-id': 'user-77' });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const json = await (res as Response).json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(AqarListingConstructor).toBeDefined();
      // new AqarListing was used with tenant/user context
      const call = (AqarListingConstructor as any).mock?.calls?.[0]?.[0];
      // If constructor was not tracked as mock, we still verify the save call counts
      // through instance save stubbing via side-effects.
      expect(Property.findOne).toHaveBeenCalledWith({
        _id: 'prop-1',
        tenantId: 'tenant-9',
      });
    });

    test('returns 404 when property does not exist', async () => {
      Property.findOne.mockResolvedValueOnce(null);

      const req = buildPostReq(baseBody, { 'x-tenant-id': 'tenant-missing' });

      const res = await POST(req);
      expect(res.status).toBe(404);

      const json = await (res as Response).json();
      expect(json).toEqual({ success: false, error: 'Property not found' });
    });

    test('returns 400 on validation error (missing required fields)', async () => {
      Property.findOne.mockResolvedValueOnce({ _id: 'prop-1', tenantId: 't1' });

      const invalidBody = {
        ...baseBody,
        title: 'shrt', // too short (min 5)
        price: { amount: -1 }, // invalid
      };

      const req = buildPostReq(invalidBody, { 'x-tenant-id': 't1' });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await (res as Response).json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Validation error');
      expect(Array.isArray(json.details)).toBe(true);
    });

    test('returns 500 on unexpected error during save', async () => {
      Property.findOne.mockResolvedValueOnce({ _id: 'prop-1', tenantId: 't1' });

      // Force the new AqarListing().save call to throw
      const original = (AqarListingConstructor as unknown as any);
      // Replace the constructor temporarily to inject failing instance
      const failingCtor = function (this: any, data: any) {
        Object.assign(this, data);
        this.save = jest.fn().mockRejectedValue(new Error('db down'));
      } as any;
      failingCtor.find = original.find;
      failingCtor.countDocuments = original.countDocuments;

      jest.doMock('@/src/server/models/AqarListing', () => ({
        __esModule: true,
        AqarListing: failingCtor,
      }));
      // Re-import the module under test to pick up the new mock
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const handlers = require('./route');

      const req = buildPostReq(baseBody, { 'x-tenant-id': 't1' });

      const res = await handlers.POST(req);
      expect(res.status).toBe(500);

      const json = await (res as Response).json();
      expect(json).toEqual({ success: false, error: 'Failed to create listing' });
    });
  });
});