import { randomUUID } from 'node:crypto';
import { MockDatabase } from '../src/lib/mockDb.js';
import path from 'node:path';
import url from 'node:url';

// Idempotent seed for demo-tenant marketplace data when using MockDB
const db = MockDatabase.getInstance();

export function upsert(collection, predicate, doc) {
  const data = db.getCollection(collection);
  const idx = data.findIndex(predicate);
  const timestamp = Date.now();
  const normalizedDoc = (doc && typeof doc === 'object') ? doc : {};

  if (idx >= 0) {
    const { _id: _ignoreId, createdAt: _ignoreCreatedAt, ...rest } = normalizedDoc;
    data[idx] = { ...data[idx], ...rest, updatedAt: new Date(timestamp) };
    db.setCollection(collection, data);
    return data[idx];
  }

  const { _id: providedId, createdAt: providedCreatedAt, ...rest } = normalizedDoc;
  const candidateCreatedAt = providedCreatedAt ? new Date(providedCreatedAt) : new Date(timestamp);
  const created = {
    ...rest,
    _id: (typeof providedId === 'string' && providedId.length > 0) ? providedId : randomUUID(),
    createdAt: isNaN(candidateCreatedAt.getTime()) ? new Date(timestamp) : candidateCreatedAt,
    updatedAt: new Date(timestamp)
  };
  data.push(created);
  db.setCollection(collection, data);
  return created;
}

export async function main() {
  if (process.env.USE_MOCK_DB !== 'true') {
    throw new Error(
      'Refusing to seed MockDB. Set USE_MOCK_DB=true to proceed in non-production environments.'
    );
  }
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
    const entryArg = process.argv[1];
    if (!entryArg) return false;
    const entryHref = url.pathToFileURL(path.resolve(entryArg)).href;
    return import.meta.url === entryHref;
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

