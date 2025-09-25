import { NextRequest, NextResponse } from 'next/server';

import { APPS, AppKey } from '@/src/config/topbar-modules';
import { db } from '@/src/lib/mongo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SearchResult = {
  id: string;
  entity: string;
  title: string;
  subtitle: string;
  href: string;
  score: number;
};

const DEFAULT_LIMIT = 20;
const PER_ENTITY_LIMIT = 5;

export async function GET(req: NextRequest) {
  try {
    await db; // Ensure database connection
    const { searchParams } = new URL(req.url);
    const app = (searchParams.get('app') || 'fm') as AppKey;
    const q = (searchParams.get('q') || '').trim();
    const entities = (searchParams.get('entities') || '').split(',').filter(Boolean);
    const limitParam = Number.parseInt(searchParams.get('limit') ?? '', 10);
    const resultLimit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : DEFAULT_LIMIT;

    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const appConfig = APPS[app];
    if (!appConfig) {
      return NextResponse.json({ results: [] });
    }

    const searchEntities = entities.length > 0 ? entities : appConfig.searchEntities;
    const uniqueEntities = Array.from(new Set(searchEntities)).filter(Boolean);

    const entityQueries = uniqueEntities.map(async entity => {
      try {
        const { collection, query } = resolveCollectionAndQuery(entity, q);
        if (!collection) {
          return [] as SearchResult[];
        }

        const items = await collection
          .find(query)
          .project({ score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' } })
          .limit(PER_ENTITY_LIMIT)
          .toArray();

        return items.map((item: Record<string, any>) => ({
          id: item._id?.toString() ?? '',
          entity,
          title: item.title || item.name || item.code || `Untitled ${entity}`,
          subtitle: item.description || item.address || item.status || '',
          href: generateHref(entity, item._id?.toString() ?? ''),
          score: item.score ?? 0
        }));
      } catch (error) {
        console.warn(`Search failed for entity ${entity}:`, error);
        return [] as SearchResult[];
      }
    });

    const settled = await Promise.allSettled(entityQueries);
    const results = settled.flatMap(result => (result.status === 'fulfilled' ? result.value : []));

    results.sort((a, b) => (b.score || 0) - (a.score || 0));

    return NextResponse.json(
      { results: results.slice(0, resultLimit) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}

function resolveCollectionAndQuery(entity: string, q: string) {
  const baseQuery = {
    $text: { $search: q },
    deletedAt: { $exists: false }
  };

  switch (entity) {
    case 'work_orders':
      return { collection: db.collection('work_orders'), query: baseQuery };
    case 'properties':
      return { collection: db.collection('properties'), query: baseQuery };
    case 'units':
      return { collection: db.collection('units'), query: baseQuery };
    case 'tenants':
      return { collection: db.collection('tenants'), query: baseQuery };
    case 'vendors':
      return { collection: db.collection('vendors'), query: baseQuery };
    case 'invoices':
      return { collection: db.collection('invoices'), query: baseQuery };
    case 'products':
      return { collection: db.collection('products'), query: baseQuery };
    case 'services':
      return { collection: db.collection('services'), query: baseQuery };
    case 'rfqs':
      return { collection: db.collection('rfqs'), query: baseQuery };
    case 'orders':
      return { collection: db.collection('orders'), query: baseQuery };
    case 'listings':
      return { collection: db.collection('listings'), query: baseQuery };
    case 'projects':
      return { collection: db.collection('projects'), query: baseQuery };
    case 'agents':
      return { collection: db.collection('agents'), query: baseQuery };
    default:
      return { collection: null, query: baseQuery };
  }
}

function generateHref(entity: string, id: string): string {
  switch (entity) {
    case 'work_orders':
      return `/work-orders/${id}`;
    case 'properties':
      return `/properties/${id}`;
    case 'units':
      return `/properties/units/${id}`;
    case 'tenants':
      return `/tenants/${id}`;
    case 'vendors':
      return `/vendors/${id}`;
    case 'invoices':
      return `/finance/invoices/${id}`;
    case 'products':
      return `/marketplace/products/${id}`;
    case 'services':
      return `/marketplace/services/${id}`;
    case 'rfqs':
      return `/marketplace/rfqs/${id}`;
    case 'orders':
      return `/marketplace/orders/${id}`;
    case 'listings':
      return `/aqar/listings/${id}`;
    case 'projects':
      return `/aqar/projects/${id}`;
    case 'agents':
      return `/aqar/agents/${id}`;
    default:
      return `/record/${entity}/${id}`;
  }
}