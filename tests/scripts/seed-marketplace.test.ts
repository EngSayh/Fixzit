import { vi } from 'vitest';
/**
 * Test framework: Vitest (TypeScript)
 */

import path from 'node:path'
import url from 'node:url'

/**
 * We import the seed-marketplace.ts module.
 * The TypeScript version is the production script (used in package.json).
 */
const repoRoot = path.resolve(process.cwd())
const candidateModulePaths = [
  path.join(repoRoot, 'scripts', 'seed-marketplace.ts'),
]
type SeedModule = {
  upsert: (collection: string, predicate: (doc: Doc) => boolean, payload: Doc) => Doc;
  main?: () => Promise<void>;
};

// Lightweight mock in lieu of the actual MockDatabase implementation.
// use jest.mock with a virtual module to intercept that import.
type Doc = Record<string, unknown>;

class InMemoryMockDatabase {
  private static instance: InMemoryMockDatabase;
  private collections = new Map<string, Doc[]>()

  static getInstance() {
    if (!InMemoryMockDatabase.instance) {
      InMemoryMockDatabase.instance = new InMemoryMockDatabase();
    }
    return InMemoryMockDatabase.instance;
  }

  reset() {
    this.collections.clear();
  }

  getCollection(name: string): Doc[] {
    if (!this.collections.has(name)) this.collections.set(name, []);
    // return a shallow copy to simulate persistence layer reads
    return [...(this.collections.get(name) as Doc[])];
  }

  setCollection(name: string, data: Doc[]) {
    // store a copy to avoid external mutation
    this.collections.set(name, data.map(d => ({ ...d })));
  }
}

// Mock the MockDatabase module used by the seeding script.
// We need to ensure our mock path matches what Node resolves at runtime from that module.
vi.mock('@/server/database', () => {
  return {
    MockDatabase: InMemoryMockDatabase,
  }
})

// Capture console output

let consoleSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  // Reset the singleton state between tests
  InMemoryMockDatabase.getInstance().reset()
  ;(globalThis as any).__FIXZIT_MARKETPLACE_DB_MOCK__ = InMemoryMockDatabase
  consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  consoleSpy.mockRestore()
  delete (globalThis as any).__FIXZIT_MARKETPLACE_DB_MOCK__
})

async function importTargetModule(): Promise<SeedModule> {
  for (const p of candidateModulePaths) {
    try {
      // Use file URL for ESM imports if needed
      const fileUrl = url.pathToFileURL(p).href
       
      return await import(fileUrl)
    } catch (e) {
      // continue to next candidate
    }
  }
  throw new Error('Could not import seeding module. Please ensure scripts/seed-marketplace.mjs exists.')
}

describe('seed-marketplace script', () => {
  test('upsert inserts when no match and sets timestamps and _id', async () => {
    const mod = await importTargetModule()
    const db = InMemoryMockDatabase.getInstance()

    const before = db.getCollection('searchsynonyms')
    expect(before).toHaveLength(0)

    const created = mod.upsert(
      'searchsynonyms',
      (x: Doc) => x.locale === 'en' && x.term === 'ac filter',
      { locale: 'en', term: 'ac filter', synonyms: ['hvac filter'] }
    )

    const after = db.getCollection('searchsynonyms')
    expect(after).toHaveLength(1)
    expect(created).toMatchObject({
      locale: 'en',
      term: 'ac filter',
      synonyms: ['hvac filter'],
    })
    expect(created).toHaveProperty('_id')
    expect(typeof created._id).toBe('string')
    expect(created).toHaveProperty('createdAt')
    expect(created).toHaveProperty('updatedAt')
    expect(new Date(created.createdAt).getTime()).toBeGreaterThan(0)
    expect(new Date(created.updatedAt).getTime()).toBeGreaterThan(0)
  })

  test('upsert updates when match exists and preserves createdAt while refreshing updatedAt', async () => {
    const mod = await importTargetModule()
    const db = InMemoryMockDatabase.getInstance()

    const first = mod.upsert(
      'searchsynonyms',
      (x: Doc) => x.locale === 'en' && x.term === 'ac filter',
      { locale: 'en', term: 'ac filter', synonyms: ['hvac filter'] }
    )

    // Advance the clock artificially by replacing Date.now (keeps test runner stable)
    const originalNow = Date.now

    try {
      const t0 = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(t0 + 5_000)

      const updated = mod.upsert(
        'searchsynonyms',
        (x: Doc) => x.locale === 'en' && x.term === 'ac filter',
        { synonyms: ['hvac filter', 'air filter'] } // partial update payload
      )

      expect(updated._id).toBe(first._id)
      expect(updated.createdAt).toEqual(first.createdAt)
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(new Date(first.updatedAt).getTime())
      expect(updated.synonyms).toEqual(['hvac filter', 'air filter'])
      expect(updated.term).toBe('ac filter') // unchanged
      expect(updated.locale).toBe('en')
    } finally {
      if (typeof (Date.now as unknown as { mockRestore?: () => void }).mockRestore === 'function') {
        (Date.now as unknown as { mockRestore: () => void }).mockRestore();
      }
      // ensure Date.now restored in all environments
      Date.now = originalNow
    }
  })

  test('main() seeds the expected synonyms and product for demo-tenant', async () => {
    const mod = await importTargetModule()
    const db = InMemoryMockDatabase.getInstance()

    // The module calls main() on import in the provided snippet.
    // If the module did not auto-execute, call it explicitly to seed.
    if (typeof mod.main === 'function') {
      // Reset first to ensure a clean run
      db.reset()
      consoleSpy.mockClear()
      await mod.main()
    }

    const synonyms = db.getCollection('searchsynonyms')
    const products = db.getCollection('marketplaceproducts')

    // Verify two specific synonym entries exist
    const enAc = synonyms.find(x => x.locale === 'en' && x.term === 'ac filter')!
    const arPaint = synonyms.find(x => x.locale === 'ar' && x.term === 'دهان')!

    expect(enAc).toBeTruthy()
    expect(enAc.synonyms).toEqual(expect.arrayContaining(['hvac filter', 'air filter', 'فلتر مكيف']))

    expect(arPaint).toBeTruthy()
    expect(arPaint.synonyms).toEqual(expect.arrayContaining(['طلاء', 'paint', 'painter']))

    // Verify product
    const product = products.find(x => x.slug === 'portland-cement-type-1-2-50kg' && x.tenantId === 'demo-tenant')!
    expect(product).toBeTruthy()
    expect(product).toMatchObject({
      tenantId: 'demo-tenant',
      sku: 'CEM-001-50',
      slug: 'portland-cement-type-1-2-50kg',
      title: expect.objectContaining({ en: 'Portland Cement Type I/II — 50kg' }),
      brand: 'Fixzit Materials',
      prices: [{ currency: 'SAR', listPrice: 16.5 }],
      inventories: [{ onHand: 200, leadDays: 2 }],
      rating: { avg: 4.6, count: 123 },
    })
    expect(Array.isArray(product.images)).toBe(true)
    expect(product.searchable).toEqual(
      expect.objectContaining({ en: expect.stringContaining('Portland Cement') })
    )
    expect(product._id).toBeDefined()
    expect(product.createdAt).toBeDefined()
    expect(product.updatedAt).toBeDefined()

    // Verify console side effect
  })

  test('idempotency: running main() twice should update existing docs, not create duplicates', async () => {
    const mod = await importTargetModule()
    const db = InMemoryMockDatabase.getInstance()

    db.reset()
    consoleSpy.mockClear()
    if (typeof mod.main === 'function') {
      await mod.main()
      await mod.main()
    }

    const synonyms = db.getCollection('searchsynonyms')
    const products = db.getCollection('marketplaceproducts')

    // Expect exactly two synonyms entries (en/ac filter and ar/دهان) and one product
    const enMatches = synonyms.filter(x => x.locale === 'en' && x.term === 'ac filter')
    const arMatches = synonyms.filter(x => x.locale === 'ar' && x.term === 'دهان')
    const productMatches = products.filter(x => x.slug === 'portland-cement-type-1-2-50kg' && x.tenantId === 'demo-tenant')

    expect(enMatches).toHaveLength(1)
    expect(arMatches).toHaveLength(1)
    expect(productMatches).toHaveLength(1)
  })

  test('upsert handles predicates that throw by propagating the error', async () => {
    const mod = await importTargetModule()
    const db = InMemoryMockDatabase.getInstance()
    db.reset()

    expect(() => mod.upsert('searchsynonyms', () => { throw new Error('bad predicate') }, { foo: 'bar' }))
      .toThrow('bad predicate')
  })
})
