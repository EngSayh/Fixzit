/**
 * Asset model unit tests
 * Testing library/framework: Vitest
 * 
 * ✅ FIXED: MongoDB Memory Server now provides real database for testing
 * All validation tests, defaults, and indexes now work properly with in-memory MongoDB.
 * 
 * CRITICAL FIX: Import models AFTER mongoose is connected (in beforeEach),
 * not at module level. This ensures plugins run against a connected instance.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { setTenantContext, clearTenantContext } from '@/server/plugins/tenantIsolation';

// Model will be imported AFTER mongoose connection is ready
let Asset: mongoose.Model<any>;

/**
 * Wait for mongoose connection to be ready.
 * CI environments need more time due to MongoDB Memory Server download/startup.
 */
async function waitForMongoConnection(maxWaitMs = 60000): Promise<void> {
  const start = Date.now();
  while (mongoose.connection.readyState !== 1) {
    if (Date.now() - start > maxWaitMs) {
      throw new Error(
        `Mongoose not connected after ${maxWaitMs}ms - readyState: ${mongoose.connection.readyState}`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

beforeEach(async () => {
  // Wait for mongoose connection from vitest.setup.ts beforeAll
  // CI environments may take longer due to cold start
  await waitForMongoConnection(60000);
  
  // Clear tenant context first
  clearTenantContext();
  
  await mongoose.connection.dropDatabase();
  
  // Clear model from mongoose cache using proper API
  if (mongoose.connection.models.Asset) {
    mongoose.connection.deleteModel('Asset');
  }
  
  // Clear Vitest module cache to force fresh import
  vi.resetModules();
  
  // Import model AFTER connection is ready - ensures plugins apply correctly
  const assetModule = await import('@/server/models/Asset');
  Asset = assetModule.Asset as mongoose.Model<any>;  // 5. Set tenant context for tests
  setTenantContext({ orgId: 'org-test-123' });
  
  // 6. Verify model is properly initialized
  if (!Asset || !Asset.schema) {
    throw new Error('Asset model not properly initialized');
  }
  
  // 7. Verify orgId field exists (proves tenantIsolationPlugin ran)
  if (!Asset.schema.paths.orgId) {
    console.error('Schema paths available:', Object.keys(Asset.schema.paths));
    throw new Error('Asset schema missing orgId - tenantIsolationPlugin did not run');
  }
});

type AnyObj = Record<string, any>;
type PartialAsset = Partial<any> & AnyObj;

/**
 * Build a valid asset with proper ObjectId types for fields that require them
 * Simplified to avoid nested array/object schemas that have type definition issues
 */
function buildValidAsset(overrides: PartialAsset = {}): AnyObj {
  // Use actual ObjectIds for fields that require them
  const orgId = new mongoose.Types.ObjectId();
  const createdById = new mongoose.Types.ObjectId();
  const propertyId = new mongoose.Types.ObjectId();
  
  const condition = {
    score: 50,
    sensors: [],
    alerts: [],
  };

  const depreciation = {
    method: 'STRAIGHT_LINE',
    usefulLifeYears: 10,
    salvageValue: 0,
  };

  return {
    orgId, // ObjectId (required by plugin)
    code: `ASSET-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Main Asset',
    type: 'HVAC',
    category: 'MEP',
    propertyId: propertyId.toString(), // String reference to Property
    createdBy: createdById, // ObjectId reference to User
    condition,
    depreciation,
    // Only include simple fields to avoid nested schema type issues
    // The Asset model has complex nested schemas (condition.sensors, condition.alerts, etc.)
    // which have mongoose schema definition issues (type: String gets confused with Schema type definition)
    ...overrides,
  };
}

describe('Asset model schema', () => {
  it('validates a minimally valid asset and applies default status and criticality', () => {
    const data = buildValidAsset({ status: undefined, criticality: undefined });
    const doc = new Asset(data);
    const err = doc.validateSync();
    expect(err).toBeUndefined();
    expect(doc.status).toBe('ACTIVE');
    expect(doc.criticality).toBe('MEDIUM');
  });

  it('fails validation when required fields are missing', () => {
    const required = ['orgId', 'code', 'name', 'type', 'category', 'propertyId', 'createdBy'] as const; // Changed tenantId to orgId
    for (const field of required) {
      const data = buildValidAsset();
      delete (data as AnyObj)[field];
      const doc = new Asset(data);
      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect((err as AnyObj).errors?.[field]).toBeDefined();
    }
  });

  it('enforces enum for "type"', () => {
    const ok = new Asset(buildValidAsset({ type: 'ELECTRICAL' }));
    expect(ok.validateSync()).toBeUndefined();

    const bad = new Asset(buildValidAsset({ type: 'INVALID_TYPE' }));
    const err = bad.validateSync();
    expect(err).toBeDefined();
    expect((err as AnyObj).errors?.type).toBeDefined();
  });

  it('enforces enum for "status" and "criticality"', () => {
    const badStatus = new Asset(buildValidAsset({ status: 'BROKEN' }));
    const errStatus = badStatus.validateSync();
    expect(errStatus).toBeDefined();
    expect((errStatus as AnyObj).errors?.status).toBeDefined();

    const badCrit = new Asset(buildValidAsset({ criticality: 'ULTRA' }));
    const errCrit = badCrit.validateSync();
    expect(errCrit).toBeDefined();
    expect((errCrit as AnyObj).errors?.criticality).toBeDefined();
  });

  it('enforces condition.score boundaries (0..100 inclusive)', () => {
    let doc = new Asset(buildValidAsset({ condition: { ...buildValidAsset().condition, score: -1 } }));
    expect(doc.validateSync()?.errors?.['condition.score']).toBeDefined();

    doc = new Asset(buildValidAsset({ condition: { ...buildValidAsset().condition, score: 101 } }));
    expect(doc.validateSync()?.errors?.['condition.score']).toBeDefined();

    doc = new Asset(buildValidAsset({ condition: { ...buildValidAsset().condition, score: 0 } }));
    expect(doc.validateSync()).toBeUndefined();

    doc = new Asset(buildValidAsset({ condition: { ...buildValidAsset().condition, score: 100 } }));
    expect(doc.validateSync()).toBeUndefined();
  });

  it('validates maintenanceHistory.type against its enum', () => {
    const ok = new Asset(buildValidAsset({ maintenanceHistory: [{ type: 'INSPECTION' }] }));
    expect(ok.validateSync()).toBeUndefined();

    const bad = new Asset(buildValidAsset({ maintenanceHistory: [{ type: 'RANDOM' }] }));
    const err = bad.validateSync();
    expect(err).toBeDefined();
    expect((err as AnyObj).errors?.['maintenanceHistory.0.type']).toBeDefined();
  });

  it('validates depreciation.method enum', () => {
    const ok = new Asset(buildValidAsset({ depreciation: { ...buildValidAsset().depreciation, method: 'DECLINING_BALANCE' } }));
    expect(ok.validateSync()).toBeUndefined();

    const bad = new Asset(buildValidAsset({ depreciation: { ...buildValidAsset().depreciation, method: 'RANDOM' } }));
    const err = bad.validateSync();
    expect(err).toBeDefined();
    expect((err as AnyObj).errors?.['depreciation.method']).toBeDefined();
  });

  it('has autoIndex disabled (indexes managed in lib/db/collections.ts)', () => {
    // Per STRICT v4.1 architecture: indexes are centralized in lib/db/collections.ts
    // Schema-level autoIndex should be disabled to prevent duplicate index creation
    const schema: AnyObj = Asset.schema;
    expect(schema?.options?.autoIndex).toBe(false);
  });

  it('configures timestamps', () => {
    const schema: AnyObj = Asset.schema;
    expect(schema?.options?.timestamps).toBe(true);
    expect(schema.path('createdAt')).toBeDefined();
    expect(schema.path('updatedAt')).toBeDefined();
  });
});
