/**
 * Testing library/framework: Jest (assumed). Tests are written in TypeScript and use virtual module mocks.
 * These tests focus on GET and POST handlers for the Aqar listing route, covering success, edge, and failure paths.
 */

jest.mock('next/server', () => {
  return {
    // Minimal NextResponse.json stub returning a simple object for assertions
    NextResponse: {
      json: (body: any, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        body
      })
    },
    // Type placeholder; not used at runtime (we pass plain objects with required shape)
    NextRequest: class {}
  };
}, { virtual: true });

jest.mock('@/src/db/mongoose', () => {
  return {
    dbConnect: jest.fn().mockResolvedValue(undefined)
  };
}, { virtual: true });

jest.mock('@/src/server/models/AqarListing', () => {
  return {
    AqarListing: {
      findOne: jest.fn(),             // Used in both GET (with chain) and POST (direct await)
      findByIdAndUpdate: jest.fn().mockResolvedValue(null),
      find: jest.fn()                 // Used in GET for similar listings (chain: populate -> limit -> lean)
    }
  };
}, { virtual: true });

jest.mock('@/src/server/models/AqarLead', () => {
  class MockLead {
    [key: string]: any;
    constructor(data: any) {
      Object.assign(this, data);
    }
    save = jest.fn().mockResolvedValue(this);
  }
  return { AqarLead: MockLead };
}, { virtual: true });

jest.mock('mongoose', () => {
  return {
    Types: {
      ObjectId: {
        isValid: jest.fn().mockReturnValue(true)
      }
    }
  };
}, { virtual: true });

import { GET, POST } from './route';

const getListingsModel = () => (jest.requireMock('@/src/server/models/AqarListing') as any).AqarListing;
const getLeadsClass = () => (jest.requireMock('@/src/server/models/AqarLead') as any).AqarLead;
const getMongoose = () => (jest.requireMock('mongoose') as any);
const getNextServer = () => (jest.requireMock('next/server') as any);

function makeHeaders(headers: Record<string, string | undefined> = {}) {
  const normalized: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(headers)) {
    normalized[k.toLowerCase()] = v;
  }
  return {
    get: (key: string) => normalized[key.toLowerCase()]
  };
}
function makeGetReq(headers: Record<string, string | undefined> = {}) {
  return { headers: makeHeaders(headers) } as any;
}
function makePostReq(body: any, headers: Record<string, string | undefined> = {}) {
  return { headers: makeHeaders(headers), json: async () => body } as any;
}

describe('API: app/api/aqar/listings/[id]/route', () => {
  const listingSample = {
    _id: 'listing123',
    location: { city: 'Riyadh' },
    propertyType: 'apartment',
    purpose: 'rent',
    propertyId: 'prop1'
  };

  beforeEach(() => {
    jest.resetAllMocks();
    // Default dbConnect resolves (configured in mock)
  });

  describe('GET handler', () => {
    test('returns 404 when listing is not found', async () => {
      const AqarListing = getListingsModel();
      const mongoose = getMongoose();

      mongoose.Types.ObjectId.isValid.mockReturnValue(true);

      AqarListing.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null)
      });
      AqarListing.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      const res = await GET(makeGetReq({ 'x-tenant-id': 'tenant-1' }), { params: { id: '507f1f77bcf86cd799439011' } });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ success: false, error: 'Listing not found' });
    });

    test('returns 200 with listing and similar listings; increments view count', async () => {
      const AqarListing = getListingsModel();
      const mongoose = getMongoose();

      mongoose.Types.ObjectId.isValid.mockReturnValue(true);

      AqarListing.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(listingSample)
      });

      const similar = [{ _id: 'a' }, { _id: 'b' }];
      AqarListing.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(similar)
      });

      AqarListing.findByIdAndUpdate.mockResolvedValueOnce(null);

      const res = await GET(makeGetReq({ 'x-tenant-id': 'tenant-2' }), { params: { id: '507f1f77bcf86cd799439011' } });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.listing).toEqual(listingSample);
      expect(res.body.data.similarListings).toEqual(similar);
      expect(AqarListing.findByIdAndUpdate).toHaveBeenCalledWith(listingSample._id, { $inc: { views: 1 } });
    });

    test('uses slug when id is not a valid ObjectId and includes provided tenantId', async () => {
      const AqarListing = getListingsModel();
      const mongoose = getMongoose();

      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      AqarListing.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(listingSample)
      });
      AqarListing.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      const tenantId = 'tenant-abc';
      const slug = 'some-listing-slug';
      await GET(makeGetReq({ 'x-tenant-id': tenantId }), { params: { id: slug } });

      expect(AqarListing.findOne).toHaveBeenCalledTimes(1);
      const queryArg = AqarListing.findOne.mock.calls[0][0];
      expect(queryArg).toEqual({ slug, tenantId, status: 'active' });
    });

    test('falls back to default tenantId when header missing', async () => {
      const AqarListing = getListingsModel();
      const mongoose = getMongoose();

      mongoose.Types.ObjectId.isValid.mockReturnValue(true);

      AqarListing.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(listingSample)
      });
      AqarListing.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      await GET(makeGetReq(), { params: { id: '507f1f77bcf86cd799439011' } });

      const queryArg = AqarListing.findOne.mock.calls[0][0];
      expect(queryArg.tenantId).toBe('default');
    });

    test('returns 500 on unexpected error', async () => {
      const AqarListing = getListingsModel();
      const mongoose = getMongoose();

      mongoose.Types.ObjectId.isValid.mockReturnValue(true);

      AqarListing.findOne.mockImplementation(() => { throw new Error('boom'); });

      const res = await GET(makeGetReq({ 'x-tenant-id': 'tenant-err' }), { params: { id: '507f1f77bcf86cd799439011' } });
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ success: false, error: 'Failed to fetch listing' });
    });
  });

  describe('POST handler', () => {
    const validBody = {
      name: 'John Doe',
      phone: '1234567890', // >= 10 chars
      email: 'john@example.com',
      whatsapp: '12345',
      message: 'Interested',
      budget: { min: 1000, max: 2000, currency: 'SAR' }
    };

    test('returns 400 on validation error (invalid body)', async () => {
      // Missing required phone; name too short
      const invalidBody = { name: 'A' };

      const res = await POST(makePostReq(invalidBody, { 'x-tenant-id': 'tenant-1' }), { params: { id: 'anything' } });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation error');
      expect(Array.isArray(res.body.details)).toBe(true);
      expect(res.body.details.length).toBeGreaterThan(0);
    });

    test('returns 404 when listing is not found', async () => {
      const AqarListing = getListingsModel();
      const mongoose = getMongoose();

      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      AqarListing.findOne.mockResolvedValueOnce(null);

      const res = await POST(makePostReq(validBody, { 'x-tenant-id': 'tenant-zz' }), { params: { id: '507f1f77bcf86cd799439011' } });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ success: false, error: 'Listing not found' });
    });

    test('creates lead and returns 201; increments inquiries and respects x-user-id', async () => {
      const AqarListing = getListingsModel();
      const mongoose = getMongoose();

      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      AqarListing.findOne.mockResolvedValueOnce(listingSample);
      AqarListing.findByIdAndUpdate.mockResolvedValueOnce(null);

      const userId = 'user-123';
      const res = await POST(makePostReq(validBody, { 'x-tenant-id': 'tenant-made', 'x-user-id': userId }), { params: { id: '507f1f77bcf86cd799439011' } });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeTruthy();

      const lead = res.body.data;
      expect(lead.createdBy).toBe(userId);
      expect(lead.tenantId).toBe('tenant-made');
      expect(lead.listingId).toBe(listingSample._id);
      expect(lead.propertyId).toBe(listingSample.propertyId);

      expect(AqarListing.findByIdAndUpdate).toHaveBeenCalledWith(listingSample._id, { $inc: { inquiries: 1 } });
    });

    test('creates lead with default createdBy when x-user-id is missing', async () => {
      const AqarListing = getListingsModel();
      const mongoose = getMongoose();

      mongoose.Types.ObjectId.isValid.mockReturnValue(false); // use slug path
      AqarListing.findOne.mockResolvedValueOnce(listingSample);
      AqarListing.findByIdAndUpdate.mockResolvedValueOnce(null);

      const res = await POST(makePostReq(validBody, { 'x-tenant-id': 'tenant-no-user' }), { params: { id: 'sluggy' } });

      expect(res.status).toBe(201);
      expect(res.body.data.createdBy).toBe('system');
      // Verify query was built using slug
      expect(AqarListing.findOne).toHaveBeenCalledTimes(1);
      const query = AqarListing.findOne.mock.calls[0][0];
      expect(query).toEqual({ slug: 'sluggy', tenantId: 'tenant-no-user', status: 'active' });
    });

    test('returns 500 on unexpected error (e.g., save failure)', async () => {
      const AqarListing = getListingsModel();
      const LeadClass = getLeadsClass();

      AqarListing.findOne.mockResolvedValueOnce(listingSample);
      // Force save failure
      LeadClass.prototype.save = jest.fn().mockRejectedValueOnce(new Error('save failed'));

      const res = await POST(makePostReq(validBody, { 'x-tenant-id': 'tenant-err' }), { params: { id: '507f1f77bcf86cd799439011' } });
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ success: false, error: 'Failed to create lead' });
    });

    test('builds query with _id when id is a valid ObjectId', async () => {
      const AqarListing = getListingsModel();
      const mongoose = getMongoose();

      mongoose.Types.ObjectId.isValid.mockReturnValue(true);
      AqarListing.findOne.mockResolvedValueOnce(listingSample);

      await POST(makePostReq(validBody, { 'x-tenant-id': 'tenant-x' }), { params: { id: '507f1f77bcf86cd799439011' } });

      const query = AqarListing.findOne.mock.calls[0][0];
      expect(query).toEqual({ _id: '507f1f77bcf86cd799439011', tenantId: 'tenant-x', status: 'active' });
    });
  });
});