const { randomUUID } = require('node:crypto');

const DEFAULT_TENANT_ID = 'demo-tenant';

function normalizeDocument(doc) {
  if (!doc || typeof doc !== 'object') {
    return {};
  }
  return { ...doc };
}

function createUpsert(db) {
  if (!db || typeof db.getCollection !== 'function' || typeof db.setCollection !== 'function') {
    throw new Error('Mock database instance must expose getCollection/setCollection');
  }

  return function upsert(collection, predicate, doc) {
    const data = db.getCollection(collection);
    const idx = data.findIndex(predicate);
    const timestamp = Date.now();
    const normalizedDoc = normalizeDocument(doc);

    if (idx >= 0) {
      const { _id: _ignoreId, createdAt: _ignoreCreatedAt, ...rest } = normalizedDoc;
      const updated = { ...data[idx], ...rest, updatedAt: new Date(timestamp) };
      data[idx] = updated;
      db.setCollection(collection, data);
      return updated;
    }

    const { _id: providedId, createdAt: providedCreatedAt, ...rest } = normalizedDoc;
    const created = {
      ...rest,
      _id: (typeof providedId === 'string' && providedId.length > 0) ? providedId : randomUUID(),
      createdAt: providedCreatedAt ? new Date(providedCreatedAt) : new Date(timestamp),
      updatedAt: new Date(timestamp),
    };

    data.push(created);
    db.setCollection(collection, data);
    return created;
  };
}

function getSeedData(tenantId = DEFAULT_TENANT_ID) {
  return {
    synonyms: [
      {
        locale: 'en',
        term: 'ac filter',
        synonyms: ['hvac filter', 'air filter', 'فلتر مكيف'],
      },
      {
        locale: 'ar',
        term: 'دهان',
        synonyms: ['طلاء', 'paint', 'painter'],
      },
    ],
    products: [
      {
        tenantId,
        sku: 'CEM-001-50',
        slug: 'portland-cement-type-1-2-50kg',
        title: 'Portland Cement Type I/II — 50kg',
        brand: 'Fixzit Materials',
        attributes: [
          { key: 'Standard', value: 'ASTM C150' },
          { key: 'Type', value: 'I/II' },
        ],
        images: [],
        prices: [{ currency: 'SAR', listPrice: 16.5 }],
        inventories: [{ onHand: 200, leadDays: 2 }],
        rating: { avg: 4.6, count: 123 },
        searchable: 'Portland Cement ASTM C150 50kg Type I/II',
      },
    ],
  };
}

module.exports = {
  DEFAULT_TENANT_ID,
  createUpsert,
  getSeedData,
};
