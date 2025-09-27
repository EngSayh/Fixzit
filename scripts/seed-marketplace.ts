// Idempotent seed for demo-tenant marketplace data when using MockDB
export interface MarketplaceSeedOptions {
  tenantId?: string;
  database: {
    getCollection: (collection: string) => any[];
    setCollection: (collection: string, data: any[]) => void;
  };
}

export async function seedMarketplace({
  tenantId = 'demo-tenant',
  database
}: MarketplaceSeedOptions): Promise<void> {
  if (!database) {
    throw new Error('A database instance is required to seed the marketplace.');
  }
  const db = database;

  function upsert(collection: string, predicate: (x: any) => boolean, doc: any) {
    const data = db.getCollection(collection);
    const idx = data.findIndex(predicate);
    if (idx >= 0) {
      const updated = { ...data[idx], ...doc, updatedAt: new Date() };
      data[idx] = updated;
      db.setCollection(collection, data);
      return updated;
    } else {
      const created = { ...doc, _id: Math.random().toString(36).slice(2), createdAt: new Date(), updatedAt: new Date() };
      data.push(created);
      db.setCollection(collection, data);
      return created;
    }
  }

  // Seed synonyms
  upsert('searchsynonyms', (x: any) => x.locale === 'en' && x.term === 'ac filter', {
    locale: 'en',
    term: 'ac filter',
    synonyms: ['hvac filter', 'air filter', 'فلتر مكيف']
  });
  upsert('searchsynonyms', (x: any) => x.locale === 'ar' && x.term === 'دهان', {
    locale: 'ar',
    term: 'دهان',
    synonyms: ['طلاء', 'paint', 'painter']
  });

  // Seed one demo product
  upsert('marketplaceproducts', (x: any) => x.tenantId === tenantId && x.slug === 'portland-cement-type-1-2-50kg', {
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

export default seedMarketplace;
