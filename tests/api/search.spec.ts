/**
 * Unit tests for GET handler of the global search API.
 * Testing library/framework: Vitest (describe/it/expect + vi.mock).
 * If your project uses Jest, replace vi.* with jest.* and adjust mocks accordingly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock NextResponse.json to a minimal compatible shape usable in unit tests
vi.mock('next/server', () => {
  return {
    NextResponse: {
      json: (data: any, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        json: async () => data,
      }),
    },
  };
});

// Provide a controllable mock for the DB module used in the route handler
const getDatabase = vi.fn();
vi.mock('@/lib/mongodb', () => ({
  getDatabase,
}));

/**
 * Helper: attempt to import the route handler from common Next.js locations.
 * Adjust order if your repository structure differs.
 */
async function loadRouteModule(): Promise<{ GET: (req: any) => Promise<any> }> {
  const candidates = [
    // src-based app router
    '../../src/app/api/search/route',
    // top-level app router
    '../../app/api/search/route',
  ];
  let lastErr: any;
  for (const p of candidates) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const mod = await import(p);
      if (mod?.GET) return mod as any;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`Unable to import GET handler from expected paths. Last error: ${lastErr?.message || lastErr}`);
}

/**
 * Create a minimal Mongo-like collection chain that respects .find().project().limit(n).toArray()
 */
function createCollection(items: any[]) {
  return {
    find: (_query: any) => ({
      project: (_projection: any) => ({
        limit: (n: number) => ({
          toArray: async () => items.slice(0, typeof n === 'number' ? n : items.length),
        }),
      }),
    }),
  };
}

/**
 * Create a minimal Mongo-like DB stub mapping collection name -> items
 */
function createDbStub(map: Record<string, any[]> | ((name: string) => any[])) {
  return {
    collection: (name: string) => {
      const items = typeof map === 'function' ? (map as any)(name) : (map as Record<string, any[]>)[name] || [];
      return createCollection(items);
    },
  };
}

/**
 * Create a DB stub whose toArray throws, to test error path
 */
function createThrowingDbStub(collectionNameToThrow: string) {
  return {
    collection: (name: string) => {
      const shouldThrow = name === collectionNameToThrow;
      return {
        find: (_q: any) => ({
          project: (_p: any) => ({
            limit: (_n: number) => ({
              toArray: async () => {
                if (shouldThrow) throw new Error(`Boom in ${name}`);
                return [];
              },
            }),
          }),
        }),
      };
    },
  };
}

function buildUrl(q: string, app?: string) {
  const params = new URLSearchParams();
  if (typeof app === 'string') params.set('app', app);
  params.set('q', q);
  return `http://localhost/api/search?${params.toString()}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules(); // ensure a fresh import of the route after mocks are in place
});

describe('GET /api/search', () => {
  it('returns 200 and empty array when q is empty', async () => {
    const { GET } = await loadRouteModule();
    const res = await GET({ url: buildUrl('') } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns 200 and empty array when q is whitespace', async () => {
    const { GET } = await loadRouteModule();
    const res = await GET({ url: buildUrl('   ') } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns empty array if DB is unreachable (getDatabase rejects)', async () => {
    getDatabase.mockRejectedValueOnce(new Error('db down'));
    const { GET } = await loadRouteModule();
    const res = await GET({ url: buildUrl('filter') } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('FM app: builds hits with proper titles, fallbacks, and href mapping', async () => {
    const fmData = {
      workOrders: [
        { _id: 1, title: 'Replace filter' },       // title preferred
        { _id: 2, code: 'WO-2' },                  // fallback to code
        { _id: 3 },                                // fallback to "WO <id>"
      ],
      properties: [
        { _id: 'p1', name: 'Palm Tower', address: { city: 'Riyadh' } }, // subtitle from city
        { _id: 'p2' },                                                   // fallback title
      ],
      tenants: [
        { _id: 't1', name: 'Acme LLC' },
        { _id: 't2' }, // fallback
      ],
      vendors: [
        { _id: 'v1', name: 'Best Supplies' },
        { _id: 'v2' }, // fallback
      ],
      invoices: [
        { _id: 'i1', invoiceNumber: 'INV-001' }, // prefer invoiceNumber
        { _id: 'i2' },                           // fallback to _id
      ],
    };

    getDatabase.mockResolvedValueOnce(
      createDbStub((name: string) => {
        if (name === 'workOrders') return fmData.workOrders;
        if (name === 'properties') return fmData.properties;
        if (name === 'tenants') return fmData.tenants;
        if (name === 'vendors') return fmData.vendors;
        if (name === 'invoices') return fmData.invoices;
        return [];
      })
    );

    const { GET } = await loadRouteModule();
    const res = await GET({ url: buildUrl('fm query', 'fm') } as any);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Total items = 3 + 2 + 2 + 2 + 2 = 11
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(11);

    // Verify representative entries, including fallbacks and ID string coercion
    expect(body).toEqual(
      expect.arrayContaining([
        { id: '1', entity: 'work_orders', title: 'Replace filter', href: '/work-orders/1' },
        { id: '2', entity: 'work_orders', title: 'WO-2', href: '/work-orders/2' },
        { id: '3', entity: 'work_orders', title: 'WO 3', href: '/work-orders/3' },
        { id: 'p1', entity: 'properties', title: 'Palm Tower', subtitle: 'Riyadh', href: '/properties/p1' },
        { id: 'p2', entity: 'properties', title: 'Property p2', href: '/properties/p2' },
        { id: 't1', entity: 'tenants', title: 'Acme LLC', href: '/fm/tenants/t1' },
        { id: 't2', entity: 'tenants', title: 'Tenant t2', href: '/fm/tenants/t2' },
        { id: 'v1', entity: 'vendors', title: 'Best Supplies', href: '/fm/vendors/v1' },
        { id: 'v2', entity: 'vendors', title: 'Vendor v2', href: '/fm/vendors/v2' },
        { id: 'i1', entity: 'invoices', title: 'Invoice INV-001', href: '/finance/invoices/i1' },
        { id: 'i2', entity: 'invoices', title: 'Invoice i2', href: '/finance/invoices/i2' },
      ])
    );
  });

  it('SOUQ app: enforces 25-item cap and correct hrefs', async () => {
    const products = Array.from({ length: 10 }, (_, i) => ({ _id: `prod_${i}`, name: `Product ${i}`, sku: `SKU-${i}` }));
    const rfqs = Array.from({ length: 6 }, (_, i) => ({ _id: `rfq_${i}`, title: `RFQ Title ${i}`, status: i % 2 ? 'open' : 'closed' }));
    // Include some orders without orderNumber to test fallback title
    const orders = Array.from({ length: 6 }, (_, i) => i % 2 === 0
      ? ({ _id: `ord_${i}`, status: 'processing' })
      : ({ _id: `ord_${i}`, orderNumber: `ORD-${i}`, status: 'completed' })
    );
    const vendors = Array.from({ length: 6 }, (_, i) => ({ _id: `ven_${i}`, name: `Vendor ${i}` }));

    getDatabase.mockResolvedValueOnce(
      createDbStub((name: string) => {
        if (name === 'products') return products;
        if (name === 'rfqs') return rfqs;
        if (name === 'orders') return orders;
        if (name === 'vendors') return vendors;
        return [];
      })
    );

    const { GET } = await loadRouteModule();
    const res = await GET({ url: buildUrl('souq query', 'souq') } as any);
    expect(res.status).toBe(200);
    const body = await res.json();

    // 10 + 6 + 6 + 6 = 28; slice to 25
    expect(body).toHaveLength(25);

    // Verify first product mapping
    expect(body[0]).toMatchObject({
      id: 'prod_0',
      entity: 'products',
      title: 'Product 0',
      subtitle: 'SKU-0',
      href: '/marketplace/items/prod_0',
    });

    // Verify an order without orderNumber uses fallback "Order <_id>"
    const someFallbackOrder = body.find((h: any) => h.entity === 'orders' && h.id === 'ord_0');
    expect(someFallbackOrder).toBeTruthy();
    expect(someFallbackOrder.title).toBe('Order ord_0');

    // The 25th item (index 24) should be the 3rd vendor (index 2), given push order then slice
    expect(body[24]).toMatchObject({
      id: 'ven_2',
      entity: 'vendors',
      title: 'Vendor 2',
      href: '/marketplace/vendors/ven_2',
    });
  });

  it('Unknown app falls back to Aqar path and mapping', async () => {
    const listings = [
      { _id: 'l1', title: 'Listing 1', location: { city: 'Jeddah' }, price: 1200000 },
      { _id: 'l2', price: 999999 }, // fallback title, subtitle uses price when city missing
    ];
    const projects = [{ _id: 'p1', name: 'Project One' }];
    const agents = [{ _id: 'a1', name: 'Agent A', company: 'ACME Realty' }];

    getDatabase.mockResolvedValueOnce(
      createDbStub((name: string) => {
        if (name === 'listings') return listings;
        if (name === 'projects') return projects;
        if (name === 'agents') return agents;
        return [];
      })
    );

    const { GET } = await loadRouteModule();
    const res = await GET({ url: buildUrl('aqar query', 'unknown-app') } as any);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toEqual(
      expect.arrayContaining([
        { id: 'l1', entity: 'listings', title: 'Listing 1', subtitle: 'Jeddah', href: '/aqar/listings/l1' },
        { id: 'l2', entity: 'listings', title: 'Listing l2', subtitle: 999999, href: '/aqar/listings/l2' },
        { id: 'p1', entity: 'projects', title: 'Project One', href: '/aqar/projects/p1' },
        { id: 'a1', entity: 'agents', title: 'Agent A', subtitle: 'ACME Realty', href: '/aqar/agents/a1' },
      ])
    );
  });

  it('Gracefully returns empty array when a DB operation throws inside try/catch', async () => {
    // Throw on the first FM collection to hit the catch block
    getDatabase.mockResolvedValueOnce(createThrowingDbStub('workOrders'));

    const { GET } = await loadRouteModule();
    const res = await GET({ url: buildUrl('will throw', 'fm') } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});