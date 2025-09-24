/**
 * Testing library/framework: Playwright Test (@playwright/test) running in Node environment.
 * These unit-like tests validate the Mongoose schema without requiring a real MongoDB connection.
 */
import { test, expect } from '@playwright/test';
import { Types } from 'mongoose';
// Import the model from the file provided in the PR (model code currently lives in a *.test.ts file path)
import { AqarSavedSearch } from '../../../src/server/models/AqarSavedSearch.test';

test.describe('AqarSavedSearch Model Schema', () => {
  const baseRequired = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    name: 'My Search',
    createdBy: 'user-1',
  };

  test('instantiates with required fields and applies defaults', () => {
    const doc = new AqarSavedSearch({
      ...baseRequired
      // omit optional fields to check defaults
    } as any);

    // Defaults
    expect(doc.notifications).toBeDefined();
    expect(doc.notifications.enabled).toBe(true);
    expect(doc.notifications.frequency).toBe('daily');

    // channels has no default; expect undefined unless explicitly set
    expect((doc.notifications as any).channels).toBeUndefined();

    expect(doc.totalMatches).toBe(0);
    expect(doc.newMatches).toBe(0);
    expect(doc.isActive).toBe(true);

    // createdAt/updatedAt are assigned on save; not present before save
    expect((doc as any).createdAt).toBeUndefined();
    expect((doc as any).updatedAt).toBeUndefined();

    // _id is generated on instantiation
    expect(doc._id).toBeInstanceOf(Types.ObjectId);
  });

  test('validates successfully on minimal valid document', async () => {
    const doc = new AqarSavedSearch({ ...baseRequired } as any);
    await expect(doc.validate()).resolves.toBeUndefined();
  });

  test('fails validation when required fields are missing', async () => {
    const doc = new AqarSavedSearch({} as any);
    await expect(doc.validate()).rejects.toMatchObject({
      name: 'ValidationError',
      errors: expect.objectContaining({
        tenantId: expect.anything(),
        userId: expect.anything(),
        name: expect.anything(),
        createdBy: expect.anything(),
      })
    });
  });

  test('enforces enum on criteria.purpose', async () => {
    const valid = new AqarSavedSearch({
      ...baseRequired,
      criteria: { purpose: 'sale' }
    } as any);
    await expect(valid.validate()).resolves.toBeUndefined();

    const invalid = new AqarSavedSearch({
      ...baseRequired,
      criteria: { purpose: 'invalid-purpose' as any }
    } as any);
    await expect(invalid.validate()).rejects.toMatchObject({
      name: 'ValidationError'
    });
  });

  test('accepts optional criteria fields with correct types', async () => {
    const doc = new AqarSavedSearch({
      ...baseRequired,
      criteria: {
        propertyType: ['apartment', 'villa'],
        city: 'Riyadh',
        district: 'Olaya',
        minPrice: 100000,
        maxPrice: 900000,
        minArea: 50,
        maxArea: 500,
        bedrooms: 3,
        bathrooms: 2,
        furnished: true,
        features: ['pool', 'gym'],
        keywords: ['near metro', 'newly built'],
      }
    } as any);

    await expect(doc.validate()).resolves.toBeUndefined();
  });

  test('enforces enum on notifications.frequency', async () => {
    const valid = new AqarSavedSearch({
      ...baseRequired,
      notifications: { enabled: true, frequency: 'instant' }
    } as any);
    await expect(valid.validate()).resolves.toBeUndefined();

    const invalid = new AqarSavedSearch({
      ...baseRequired,
      notifications: { enabled: true, frequency: 'monthly' as any }
    } as any);
    await expect(invalid.validate()).rejects.toMatchObject({
      name: 'ValidationError'
    });
  });

  test('enforces enum on notifications.channels item values', async () => {
    const valid = new AqarSavedSearch({
      ...baseRequired,
      notifications: { channels: ['email', 'sms', 'push', 'whatsapp'] }
    } as any);
    await expect(valid.validate()).resolves.toBeUndefined();

    const invalid = new AqarSavedSearch({
      ...baseRequired,
      notifications: { channels: ['fax'] as any }
    } as any);
    await expect(invalid.validate()).rejects.toMatchObject({
      name: 'ValidationError'
    });
  });

  test('allows optional dates for notifications.lastNotified and lastRun', async () => {
    const when = new Date('2024-01-02T03:04:05.000Z');
    const doc = new AqarSavedSearch({
      ...baseRequired,
      notifications: { lastNotified: when },
      lastRun: when
    } as any);
    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.notifications.lastNotified?.toISOString()).toBe(when.toISOString());
    expect(doc.lastRun?.toISOString()).toBe(when.toISOString());
  });

  test('permits toggling isActive and setting analytics counters', async () => {
    const doc = new AqarSavedSearch({
      ...baseRequired,
      isActive: false,
      totalMatches: 5,
      newMatches: 2
    } as any);
    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.isActive).toBe(false);
    expect(doc.totalMatches).toBe(5);
    expect(doc.newMatches).toBe(2);
  });

  test('exposes the declared indexes on the schema', () => {
    const idxFields = AqarSavedSearch.schema.indexes().map(([fields]) => fields);
    const expected = [
      { tenantId: 1, userId: 1 },
      { tenantId: 1, 'notifications.enabled': 1 },
      { 'notifications.lastNotified': 1 },
    ];

    for (const want of expected) {
      const found = idxFields.some(f => {
        const fKeys = Object.keys(f);
        const wKeys = Object.keys(want);
        if (fKeys.length !== wKeys.length) { return false; }
        return wKeys.every(k => (f as any)[k] === (want as any)[k]);
      });
      expect(found).toBe(true);
    }
  });

  test('allows criteria to be omitted entirely', async () => {
    const doc = new AqarSavedSearch({ ...baseRequired } as any);
    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.criteria).toBeUndefined();
  });

  test('rejects wrongly typed scalar fields in criteria', async () => {
    const invalid = new AqarSavedSearch({
      ...baseRequired,
      criteria: {
        minPrice: 'cheap' as any,
        bedrooms: 'three' as any,
        furnished: 'yes' as any
      }
    } as any);
    await expect(invalid.validate()).rejects.toMatchObject({
      name: 'ValidationError'
    });
  });

  test('accepts empty arrays for array-typed fields', async () => {
    const doc = new AqarSavedSearch({
      ...baseRequired,
      criteria: { propertyType: [], features: [], keywords: [] },
      notifications: { channels: [] }
    } as any);
    await expect(doc.validate()).resolves.toBeUndefined();
  });

  test('allows setting optional description and updatedBy', async () => {
    const doc = new AqarSavedSearch({
      ...baseRequired,
      description: 'Detailed criteria',
      updatedBy: 'admin-1'
    } as any);
    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.description).toBe('Detailed criteria');
    expect(doc.updatedBy).toBe('admin-1');
  });
});