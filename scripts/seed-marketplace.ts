import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

type MockDbInstance = {
  getCollection: (name: string) => any[];
  setCollection: (name: string, data: any[]) => void;
};

type MockDbModule = { MockDatabase: { getInstance: () => MockDbInstance } };

function resolveMockDatabase(): MockDbModule["MockDatabase"] {
  try {
    const mod = require('@/src/lib/mockDb') as MockDbModule;
    if (mod && mod.MockDatabase) {
      return mod.MockDatabase;
    }
  } catch {
    // ignore and fall back to relative resolution below
  }
  const mod = require('../src/lib/mockDb') as MockDbModule;
  return mod.MockDatabase;
}

const MockDatabase = (globalThis as Record<string, unknown>).__FIXZIT_MARKETPLACE_DB_MOCK__
  ? ((globalThis as Record<string, unknown>).__FIXZIT_MARKETPLACE_DB_MOCK__ as { getInstance: () => MockDbInstance })
  : resolveMockDatabase();

// Idempotent seed for demo-tenant marketplace data when using MockDB
const db = MockDatabase.getInstance();

export function upsert(collection: string, predicate: (x: any) => boolean, doc: any) {
  const data = db.getCollection(collection);
  const idx = data.findIndex(predicate);
  const timestamp = Date.now();

  const normalizedDoc: Record<string, unknown> =
    (doc && typeof doc === 'object') ? (doc as Record<string, unknown>) : {};

  if (idx >= 0) {
    const { _id: _ignoreId, createdAt: _ignoreCreatedAt, ...rest } = normalizedDoc;
    const updated = { ...data[idx], ...rest, updatedAt: new Date(timestamp) };
    data[idx] = updated;
    db.setCollection(collection, data);
    return updated;
  }

  // The predicate function is called on the normalized document for validation purposes.
  // This side effect allows predicates to validate the document structure and signal errors,
  // even when creating new entries and the target collection is initially empty.
  predicate(normalizedDoc);

  const { _id: providedId, createdAt: providedCreatedAt, ...rest } = normalizedDoc;
  const created = {
    ...rest,
    _id: (typeof providedId === 'string' && providedId.length > 0) ? providedId : randomUUID(),
    createdAt: providedCreatedAt ? new Date(providedCreatedAt as Date | number | string) : new Date(timestamp),
    updatedAt: new Date(timestamp)
  };
  data.push(created);
  db.setCollection(collection, data);
  return created;
}

export async function main() {
  const tenantId = 'demo-tenant';

  // Seed synonyms
  upsert('searchsynonyms', x => x.locale === 'en' && x.term === 'ac filter', {
    locale: 'en', term: 'ac filter', synonyms: ['hvac filter', 'air filter', 'فلتر مكيف']
  });
  upsert('searchsynonyms', x => x.locale === 'ar' && x.term === 'دهان', {
    locale: 'ar', term: 'دهان', synonyms: ['طلاء', 'paint', 'painter']
  });

  // Seed one demo product
  upsert('marketplaceproducts', x => x.tenantId === tenantId && x.slug === 'portland-cement-type-1-2-50kg', {
    tenantId,
    sku: 'CEM-001-50',
    slug: 'portland-cement-type-1-2-50kg',
    title: 'Portland Cement Type I/II — 50kg',
    brand: 'Fixzit Materials',
    attributes: [{ key: 'Standard', value: 'ASTM C150' }, { key: 'Type', value: 'I/II' }],
    images: [],
    prices: [{ currency: 'SAR', listPrice: 16.5 }],
    inventories: [{ onHand: 200, leadDays: 2 }],
    rating: { avg: 4.6, count: 123 },
    searchable: 'Portland Cement ASTM C150 50kg Type I/II'
  });

  // eslint-disable-next-line no-console
  console.log('✔ Marketplace seed complete (MockDB)');
}

export default main;

if (require.main === module) {
  void main();
}
