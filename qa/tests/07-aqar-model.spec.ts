import { test, expect } from '@playwright/test';
import mongoose, { Types } from 'mongoose';
import { AqarListing } from '../../src/server/models/AqarListing';

// Testing framework: Playwright Test (@playwright/test).
// Scope: Unit-style tests validating Mongoose schema (fields, defaults, enums, indexes) and slug pre-save.
// We avoid adding new deps; tests rely on mongoose validation and do not require a running Mongo server.

test.describe('AqarListing model schema', () => {
  test.beforeAll(async () => {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/test', {
          // Short timeout; we don't require actual connectivity for validation tests.
          // @ts-ignore
          serverSelectionTimeoutMS: 200,
        } as any).catch(() => Promise.resolve());
      }
    } catch {
      // Ignore connection errors; most tests only rely on local validation.
    }
  });

  test.afterAll(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
  });

  const baseDoc = () => ({
    tenantId: 'tenant-1',
    propertyId: new Types.ObjectId(),
    title: 'Spacious Villa in Riyadh',
    description: 'A stunning villa with modern amenities.',
    slug: 'spacious-villa-in-riyadh-unique',
    purpose: 'sale' as const,
    propertyType: 'villa',
    price: { amount: 2500000, currency: 'SAR', period: 'total' as const },
    specifications: {
      area: 500,
      bedrooms: 5,
      bathrooms: 4,
      livingRooms: 2,
      floors: 2,
      age: 'new',
      furnished: false,
      parking: 2,
      balcony: true,
      garden: true,
      pool: false,
      gym: false,
      security: true,
      elevator: false,
      maidRoom: true
    },
    location: {
      lat: 24.7136,
      lng: 46.6753,
      address: '123 Main St',
      city: 'Riyadh',
      district: 'Olaya',
      neighborhood: 'Central',
      postalCode: '12345'
    },
    media: [
      { url: 'https://example.com/img1.jpg', alt: 'Front view', type: 'image' as const, isCover: true },
      { url: 'https://example.com/vid1.mp4', alt: 'Tour', type: 'video' as const, isCover: false }
    ],
    contact: {
      name: 'Agent A',
      phone: '+966500000000',
      whatsapp: '+966500000001',
      email: 'agent@example.com',
      company: 'Aqar Co',
      licenseNumber: 'LIC-123',
      isVerified: true
    },
    status: 'draft' as const,
    isVerified: false,
    isFeatured: false,
    isPremium: false,
    license: {
      number: 'REG-999',
      source: 'REGA',
      isValid: false
    },
    views: 0,
    favorites: 0,
    inquiries: 0,
    keywords: ['villa', 'riyadh'],
    tags: ['spacious', 'modern'],
    createdBy: 'system'
  });

  test('valid document passes validation (no save)', async () => {
    const doc = new AqarListing(baseDoc());
    await expect(doc.validate()).resolves.toBeUndefined();
  });

  test('required top-level fields are enforced', async () => {
    // @ts-expect-error - intentionally missing required fields
    const invalid = new AqarListing({});
    await expect(invalid.validate()).rejects.toThrow(/tenantId.*required|propertyId.*required|title.*required|description.*required|purpose.*required|propertyType.*required|createdBy.*required/);
  });

  test('nested required fields (location.lat, price.amount, specifications.area)', async () => {
    const data = baseDoc();
    // @ts-expect-error
    delete (data as any).location.lat;
    // @ts-expect-error
    delete (data as any).price.amount;
    // @ts-expect-error
    delete (data as any).specifications.area;

    const doc = new AqarListing(data);
    await expect(doc.validate()).rejects.toThrow(/lat.*required|amount.*required|area.*required/);
  });

  test('rejects invalid enum values', async () => {
    const data = baseDoc();
    // @ts-ignore
    data.purpose = 'lease';
    // @ts-ignore
    data.price.period = 'weekly';
    // @ts-ignore
    data.media[0].type = 'gif';
    // @ts-ignore
    data.status = 'unknown';

    const doc = new AqarListing(data);
    await expect(doc.validate()).rejects.toThrow(/`lease` is not a valid enum value|`weekly` is not a valid enum value|`gif` is not a valid enum value|`unknown` is not a valid enum value/);
  });

  test('accepts all documented propertyType enum values', async () => {
    const allowed = ['apartment','villa','land','office','shop','building','floor','room','farm','chalet','warehouse'];
    for (const type of allowed) {
      const d = baseDoc();
      d.propertyType = type as any;
      const doc = new AqarListing(d);
      await expect(doc.validate()).resolves.toBeUndefined();
    }
  });

  test('defaults: specifications and flags applied when omitted', async () => {
    const d = baseDoc();
    delete (d as any).specifications.livingRooms;
    delete (d as any).specifications.floors;
    delete (d as any).specifications.age;
    delete (d as any).specifications.furnished;
    delete (d as any).specifications.parking;
    delete (d as any).specifications.balcony;
    delete (d as any).specifications.garden;
    delete (d as any).specifications.pool;
    delete (d as any).specifications.gym;
    delete (d as any).specifications.security;
    delete (d as any).specifications.elevator;
    delete (d as any).specifications.maidRoom;

    delete (d as any).isVerified;
    delete (d as any).isFeatured;
    delete (d as any).isPremium;

    const doc = new AqarListing(d);
    await expect(doc.validate()).resolves.toBeUndefined();

    expect(doc.specifications.livingRooms).toBe(0);
    expect(doc.specifications.floors).toBe(1);
    expect(doc.specifications.age).toBe('new');
    expect(doc.specifications.furnished).toBe(false);
    expect(doc.specifications.parking).toBe(0);
    expect(doc.specifications.balcony).toBe(false);
    expect(doc.specifications.garden).toBe(false);
    expect(doc.specifications.pool).toBe(false);
    expect(doc.specifications.gym).toBe(false);
    expect(doc.specifications.security).toBe(false);
    expect(doc.specifications.elevator).toBe(false);
    expect(doc.specifications.maidRoom).toBe(false);

    expect(doc.isVerified).toBe(false);
    expect(doc.isFeatured).toBe(false);
    expect(doc.isPremium).toBe(false);
  });

  test('media defaults: type=image, isCover=false', async () => {
    const d = baseDoc();
    d.media = [{ url: 'https://example.com/only.jpg', alt: 'Only' } as any];
    const doc = new AqarListing(d);
    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.media[0].type).toBe('image');
    expect(doc.media[0].isCover).toBe(false);
  });

  test('media.url is required when media exists', async () => {
    const d = baseDoc();
    // @ts-ignore
    d.media = [{ alt: 'missing url' }];
    const doc = new AqarListing(d);
    await expect(doc.validate()).rejects.toThrow(/url.*required/);
  });

  test('pre-save generates slug if title modified and slug missing', async () => {
    const d = baseDoc();
    delete (d as any).slug;
    const doc = new AqarListing(d);

    let saveErr: unknown = undefined;
    try {
      await doc.save().catch((e: unknown) => { saveErr = e; });
    } catch (e) {
      saveErr = e;
    }

    expect(typeof doc.slug).toBe('string');
    expect(doc.slug).toMatch(/^spacious-villa-in-riyadh-\d{10,}$/);
    // Save may fail without a DB; slug generation must occur before persistence.
  });

  test('slug is not overwritten if already set, even if title changes', async () => {
    const d = baseDoc();
    d.slug = 'custom-fixed-slug';
    const doc = new AqarListing(d);
    doc.title = 'New Title That Would Normally Change Slug';
    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.slug).toBe('custom-fixed-slug');
  });

  test('schema exposes key indexes (compound and text)', async () => {
    const indexes = (AqarListing as any).schema.indexes() as Array<[Record<string, any>, Record<string, any>?]>;
    const hasTenantStatus = indexes.some(([fields]) => fields.tenantId === 1 && fields.status === 1);
    const hasPurposeType = indexes.some(([fields]) => fields['tenantId'] === 1 && fields['purpose'] === 1 && fields['propertyType'] === 1);
    const hasCityDistrict = indexes.some(([fields]) => fields['location.city'] === 1 && fields['location.district'] === 1);
    const hasText = indexes.some(([fields]) => fields.title === 'text' && fields.description === 'text' && fields.keywords === 'text');

    expect(hasTenantStatus).toBe(true);
    expect(hasPurposeType).toBe(true);
    expect(hasCityDistrict).toBe(true);
    expect(hasText).toBe(true);
  });

  test('purpose "daily" with period "daily" validates', async () => {
    const d = baseDoc();
    d.purpose = 'daily' as any;
    d.price.period = 'daily' as any;
    const doc = new AqarListing(d);
    await expect(doc.validate()).resolves.toBeUndefined();
  });

  test('views/favorites/inquiries default to 0 and behave as numbers', async () => {
    const d = baseDoc();
    delete (d as any).views;
    delete (d as any).favorites;
    delete (d as any).inquiries;

    const doc = new AqarListing(d);
    await expect(doc.validate()).resolves.toBeUndefined();

    expect(doc.views).toBe(0);
    expect(doc.favorites).toBe(0);
    expect(doc.inquiries).toBe(0);

    doc.views += 1;
    doc.favorites += 2;
    doc.inquiries += 3;
    expect(doc.views).toBe(1);
    expect(doc.favorites).toBe(2);
    expect(doc.inquiries).toBe(3);
  });

  test('location requires city and district', async () => {
    const d = baseDoc();
    // @ts-ignore
    delete d.location.city;
    // @ts-ignore
    delete d.location.district;

    const doc = new AqarListing(d);
    await expect(doc.validate()).rejects.toThrow(/city.*required|district.*required/);
  });

  test('title is trimmed per schema', async () => {
    const d = baseDoc();
    d.title = '   Trim Me   ';
    const doc = new AqarListing(d);
    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.title).toBe('Trim Me');
  });
});