// NOTE: Test framework: Jest (default assumption when tests/*.test.ts pattern is present).
// If this repo uses Vitest, these tests are compatible with minimal changes (e.g., import { describe, it, expect } from 'vitest').

import path from 'path';

 // We will import the model using the project alias if available, otherwise attempt relative resolution.
 // Adjust the import below if your project keeps the model in a different path.
let MarketplaceProduct: any;

 // Utilities to load the module under different env configurations
const loadModelWithEnv = async (env: Partial<NodeJS.ProcessEnv>) => {
  const originalEnv = { ...process.env };
  Object.assign(process.env, env);
  jest.resetModules();
  try {
    // Attempt common locations
    let loadedModule: any = null;
    const candidates = [
      '@/models/MarketplaceProduct',
      '@/models/MarketplaceProduct',
      'src/models/MarketplaceProduct',
      'models/MarketplaceProduct',
      path.posix.join(process.cwd(), 'src/models/MarketplaceProduct'),
      path.posix.join(process.cwd(), 'models/MarketplaceProduct'),
    ];
    let lastError: any = null;
    for (const c of candidates) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        loadedModule = require(c);
        break;
      } catch (e) {
        lastError = e;
        continue;
      }
    }
    if (!loadedModule) {
      throw lastError ?? new Error('Could not locate MarketplaceProduct module. Adjust import path in tests.');
    }
    return loadedModule.MarketplaceProduct;
  } finally {
    // Restore env for caller to control further
    Object.assign(process.env, originalEnv);
  }
};

describe('MarketplaceProduct Schema', () => {
  beforeAll(async () => {
    MarketplaceProduct = await loadModelWithEnv({ NODE_ENV: 'test', MONGODB_URI: 'mongodb://not-local/ci' });
  });

  it('defines required fields (tenantId, sku, slug, title)', () => {
    const doc = new MarketplaceProduct({});
    const err = doc.validateSync();
    expect(err).toBeTruthy();
    const messages = Object.values((err as any).errors || {}).map((e: any) => e.path);
    expect(messages).toEqual(expect.arrayContaining(['tenantId', 'sku', 'slug', 'title']));
  });

  it('applies defaults for nested rating when provided as empty object', () => {
    const doc = new MarketplaceProduct({
      tenantId: 't1',
      sku: 'SKU1',
      slug: 'slug-1',
      title: 'Product 1',
      rating: {}
    });
    expect(doc.rating).toBeDefined();
    expect(doc.rating.avg).toBe(0);
    expect(doc.rating.count).toBe(0);
  });

  it('applies defaults for Inventory subdocuments', () => {
    const doc = new MarketplaceProduct({
      tenantId: 't1',
      sku: 'SKU1',
      slug: 'slug-1',
      title: 'Product 1',
      inventories: [{}]
    });
    expect(Array.isArray(doc.inventories)).toBe(true);
    expect(doc.inventories.length).toBe(1);
    const inv = doc.inventories[0];
    expect(inv.onHand).toBe(0);
    expect(inv.onOrder).toBe(0);
    expect(inv.leadDays).toBe(3);
  });

  it('sets default currency "SAR" on Price subdocuments', () => {
    const doc = new MarketplaceProduct({
      tenantId: 't1',
      sku: 'SKU1',
      slug: 'slug-1',
      title: 'Product 1',
      prices: [{ listPrice: 99 }]
    });
    expect(Array.isArray(doc.prices)).toBe(true);
    expect(doc.prices[0].currency).toBe('SAR');
  });

  it('does not assign _id to embedded subdocuments marked with { _id: false }', () => {
    const doc = new MarketplaceProduct({
      tenantId: 't1',
      sku: 'SKU1',
      slug: 'slug-1',
      title: 'Product 1',
      prices: [{ listPrice: 10 }],
      inventories: [{}],
      attributes: [{ key: 'color', value: 'red' }]
    });
    // AttributeSchema, PriceSchema, InventorySchema are created with { _id: false }
    for (const p of doc.prices) {
      expect(p._id).toBeUndefined();
      expect(p.id).toBeUndefined();
    }
    for (const inv of doc.inventories) {
      expect(inv._id).toBeUndefined();
      expect(inv.id).toBeUndefined();
    }
    for (const attr of doc.attributes) {
      expect(attr._id).toBeUndefined();
      expect(attr.id).toBeUndefined();
    }
  });

  it('includes expected indexes on the schema', () => {
    // Access schema via the model (works without DB connection)
    const schema = MarketplaceProduct.schema;
    const indexes = schema.indexes ? schema.indexes() : [];
    // Convert to comparable strings to avoid deep diffs on options
    const normalized: Array<{ spec: Record<string, any>; unique: boolean; text: boolean }> = indexes.map(([spec, opts]: [Record<string, any>, Record<string, any>]) => ({
      spec,
      unique: Boolean(opts && (opts as Record<string, any>).unique),
      text: Object.values(spec).some((v: any) => v === 'text'),
    }));

    // Unique compound indexes
    expect(normalized).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ spec: { tenantId: 1, sku: 1 }, unique: true }),
        expect.objectContaining({ spec: { tenantId: 1, slug: 1 }, unique: true }),
      ])
    );

    // Text index over title, brand, searchable, attributes.value
    const hasTextIndex = normalized.some(
      (idx: { spec: Record<string, any>; text: boolean }) =>
        idx.text &&
        idx.spec['title'] === 'text' &&
        idx.spec['brand'] === 'text' &&
        idx.spec['searchable'] === 'text' &&
        idx.spec['attributes.value'] === 'text'
    );
    expect(hasTextIndex).toBe(true);
  });

  it('does not set tierPrices by default when omitted in Price subdoc', () => {
    const doc = new MarketplaceProduct({
      tenantId: 't1',
      sku: 'SKU1',
      slug: 'slug-1',
      title: 'Product 1',
      prices: [{ listPrice: 55 }]
    });
    expect(doc.prices[0].tierPrices === undefined || Array.isArray(doc.prices[0].tierPrices)).toBe(true);
  });

  it('accepts images and attributes arrays and preserves values', () => {
    const doc = new MarketplaceProduct({
      tenantId: 't1',
      sku: 'SKU1',
      slug: 'slug-1',
      title: 'Product 1',
      images: ['a.jpg', 'b.jpg'],
      attributes: [{ key: 'size', value: 'M' }]
    });
    expect(doc.images).toEqual(['a.jpg', 'b.jpg']);
    expect(doc.attributes).toEqual([expect.objectContaining({ key: 'size', value: 'M' })]);
  });

  it('validates required fields within Price subdoc (listPrice required)', () => {
    const doc = new MarketplaceProduct({
      tenantId: 't1',
      sku: 'SKU1',
      slug: 'slug-1',
      title: 'Product 1',
      prices: [{}]
    });
    const err = doc.validateSync();
    // listPrice is required inside PriceSchema
    const priceErrorPaths = Object.values((err?.errors ?? {})).map((e: any) => e.path);
    // Mongoose error path for nested array required commonly looks like 'prices.0.listPrice'
    const hasListPriceError = priceErrorPaths.some((p: any) => String(p).endsWith('.listPrice') || String(p).includes('prices.0.listPrice'));
    expect(hasListPriceError).toBe(true);
  });
});

    const modelLocal = await loadModelWithEnv({ NODE_ENV: 'development', MONGODB_URI: '' });
    expect(modelLocal && modelLocal.schema).toBeUndefined();
  });

  it('uses real Mongoose model when not in mock conditions', async () => {
    const modelReal = await loadModelWithEnv({ NODE_ENV: 'test', MONGODB_URI: 'mongodb://not-local/ci' });
    expect(modelReal && modelReal.schema).toBeDefined();
    expect(typeof modelReal.modelName === 'string' || typeof modelReal.collection?.name === 'string').toBe(true);
  });
});

