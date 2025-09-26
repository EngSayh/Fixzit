import { MockDatabase } from '../src/lib/mockDb.js';
import url from 'node:url';

// Idempotent seed for demo-tenant marketplace data when using MockDB
const db = MockDatabase.getInstance();

export function upsert(collection, predicate, doc) {
  const data = db.getCollection(collection);
  const idx = data.findIndex(predicate);
  const timestamp = Date.now();

  if (idx >= 0) {
    data[idx] = { ...data[idx], ...doc, updatedAt: new Date(timestamp) };
    db.setCollection(collection, data);
    return data[idx];
  }

  const created = {
    ...doc,
    _id: Math.random().toString(36).slice(2),
    createdAt: new Date(timestamp),
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

  console.log('✔ Marketplace seed complete (MockDB)');
}

const isDirectExecution = (() => {
  try {
    const thisFile = url.fileURLToPath(import.meta.url);
    const entryArg = process.argv[1];
    if (!entryArg) return false;
    const entryPath = url.fileURLToPath(url.pathToFileURL(entryArg));
    return entryPath === thisFile;
  } catch {
    return false;
  }
})();

if (isDirectExecution) {
  main().catch(error => {
    // eslint-disable-next-line no-console
    console.error('Failed to seed marketplace (MockDB)', error);
    process.exitCode = 1;
  });
}

export default main;

