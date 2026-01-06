/**
 * Unit tests for HelpArticle model.
 * Framework: Vitest with MongoDB Memory Server
 *
 * ✅ Uses REAL MongoDB Memory Server
 * ✅ Tests with real database operations
 * ✅ No mocking
 * 
 * Tests validate:
 * - Schema: required fields, defaults, enums, indexes, timestamps
 * - Tenant isolation plugin (orgId field)
 * - Audit plugin (createdBy, updatedBy fields)
 * - Validation rules
 */
 
import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import mongoose from 'mongoose';
import { MongoMemoryServer } from "mongodb-memory-server";
import { setTenantContext, clearTenantContext } from '@/server/plugins/tenantIsolation';

// Model will be imported dynamically per test
let HelpArticle: mongoose.Model<any>;
let localMongoServer: MongoMemoryServer | null = null;

/**
 * Wait for mongoose connection to be ready (max 10s).
 * If not connected after timeout, starts a local MongoMemoryServer.
 */
async function ensureMongoConnection(maxWaitMs = 10000): Promise<void> {
  const start = Date.now();

  // First, wait for global setup to potentially connect
  while (mongoose.connection.readyState !== 1 && Date.now() - start < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // If still not connected, start our own MongoMemoryServer
  if (mongoose.connection.readyState !== 1) {
    if (!localMongoServer) {
      localMongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: "fixzit-test-helparticle",
          launchTimeout: 60000,
        },
      });
      const uri = localMongoServer.getUri();
      await mongoose.connect(uri, { autoCreate: true, autoIndex: true });
    }
  }

  // Final check
  if (mongoose.connection.readyState !== 1) {
    throw new Error(`Mongoose not connected - readyState: ${mongoose.connection.readyState}`);
  }
}

beforeAll(async () => {
  await ensureMongoConnection();
});

afterAll(async () => {
  // Cleanup local server if we started one
  if (localMongoServer) {
    await mongoose.disconnect();
    await localMongoServer.stop();
    localMongoServer = null;
  }
});

beforeEach(async () => {
  // Ensure connection is ready before each test (CI sharding can cause disconnection)
  await ensureMongoConnection();
  
  clearTenantContext();
  
  // Clear model from mongoose cache using proper API
  if (mongoose.connection.models.HelpArticle) {
    mongoose.connection.deleteModel('HelpArticle');
  }
  
  // Clear Vitest module cache
  vi.resetModules();
  
  // Import model AFTER connection is ready
  const helpArticleModule = await import('@/server/models/HelpArticle');
  HelpArticle = helpArticleModule.HelpArticle as mongoose.Model<any>;
  
  // Set tenant context
  setTenantContext({ orgId: new mongoose.Types.ObjectId() });
  
  // Verify model is properly initialized
  if (!HelpArticle || !HelpArticle.schema) {
    throw new Error('HelpArticle model not properly initialized');
  }

  // Ensure indexes are created in the in-memory MongoDB before running
  // tests that rely on DB-enforced uniqueness (unique compound index on orgId+slug)
  await HelpArticle.syncIndexes();
  
  // Verify orgId field exists (proves tenantIsolationPlugin ran)
  if (!HelpArticle.schema.paths.orgId) {
    console.error('Schema paths available:', Object.keys(HelpArticle.schema.paths));
    throw new Error('HelpArticle schema missing orgId - tenantIsolationPlugin did not run');
  }
  
  // Clean the collection for this test
  await HelpArticle.deleteMany({});
});

describe("HelpArticle model schema", () => {
  it("validates required fields (slug, title, content)", () => {
    const doc = new HelpArticle({});
    const err = doc.validateSync();
    
    expect(err).toBeDefined();
    expect(err?.errors?.slug).toBeDefined();
    expect(err?.errors?.title).toBeDefined();
    expect(err?.errors?.content).toBeDefined();
  });
  
  it("applies default values (status='PUBLISHED', tags=[], routeHints=[])", () => {
    const orgId = new mongoose.Types.ObjectId();
    const createdBy = new mongoose.Types.ObjectId();
    
    const doc = new HelpArticle({
      orgId,
      slug: 'test-article',
      title: 'Test Article',
      content: 'Test content',
      createdBy,
    });
    
    expect(doc.status).toBe('PUBLISHED'); // Schema default is PUBLISHED
    expect(doc.tags).toEqual([]);
    expect(doc.routeHints).toEqual([]);
    expect(doc.locale).toBe('en'); // Also check locale default
  });
  
  it("enforces status enum (DRAFT, PUBLISHED)", () => {
    const orgId = new mongoose.Types.ObjectId();
    const createdBy = new mongoose.Types.ObjectId();
    
    const validDoc = new HelpArticle({
      orgId,
      slug: 'test',
      title: 'Test',
      content: 'Content',
      status: 'PUBLISHED',
      createdBy,
    });
    expect(validDoc.validateSync()).toBeUndefined();
    
    const invalidDoc = new HelpArticle({
      orgId,
      slug: 'test2',
      title: 'Test2',
      content: 'Content2',
      status: 'INVALID_STATUS',
      createdBy,
    });
    const err = invalidDoc.validateSync();
    expect(err).toBeDefined();
    expect(err?.errors?.status).toBeDefined();
  });
  
  it("exposes expected indexes on the schema", () => {
    const indexes: Array<[Record<string, any>, Record<string, any>]> = HelpArticle.schema.indexes();
    
    // Debug: log actual indexes
    console.log('HelpArticle indexes:', JSON.stringify(indexes, null, 2));
    
    const hasIndex = (fields: Record<string, string | number>) =>
      indexes.some(([idx]) => {
        return Object.entries(fields).every(([k, v]) => idx[k] === v);
      });
    
    // Check for text index on title, content, tags
    expect(hasIndex({ title: 'text', content: 'text', tags: 'text' })).toBe(true);
    
    // Check for compound orgId indexes (tenant isolation)
    expect(hasIndex({ orgId: 1, slug: 1 })).toBe(true);
    expect(hasIndex({ orgId: 1, locale: 1 })).toBe(true); // locale, not category
    expect(hasIndex({ orgId: 1, roles: 1 })).toBe(true);
    expect(hasIndex({ orgId: 1, status: 1 })).toBe(true);
  });
  
  it("configures timestamps and has orgId from tenant isolation plugin", () => {
    const schema = HelpArticle.schema;
    
    // Check timestamps option
    expect(schema.options.timestamps).toBe(true);
    
    // Check timestamp fields exist
    expect(schema.path('createdAt')).toBeDefined();
    expect(schema.path('updatedAt')).toBeDefined();
    
    // Check orgId field from tenantIsolationPlugin
    expect(schema.path('orgId')).toBeDefined();
    expect(schema.path('orgId').options.required).toBe(true);
    
    // Check audit fields from auditPlugin
    expect(schema.path('createdBy')).toBeDefined();
    expect(schema.path('updatedBy')).toBeDefined();
  });
  
  it("enforces unique constraint on slug (within org)", async () => {
    const orgId = new mongoose.Types.ObjectId();
    const createdBy = new mongoose.Types.ObjectId();
    
    // Create first article
    const article1 = new HelpArticle({
      orgId,
      slug: 'unique-slug',
      title: 'First Article',
      content: 'First content',
      createdBy,
    });
    await article1.save();
    
    // Try to create duplicate slug in same org
    const article2 = new HelpArticle({
      orgId,
      slug: 'unique-slug',
      title: 'Second Article',
      content: 'Second content',
      createdBy,
    });
    
    await expect(article2.save()).rejects.toThrow();
  });
});
