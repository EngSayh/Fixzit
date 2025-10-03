import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { APPS, AppKey } from '@/config/topbar-modules';
import { getSessionUser } from '@/lib/auth-utils';
import * as crypto from 'crypto';

// Helper function to generate href based on entity type
function generateHref(entity: string, id: string): string {
  const baseRoutes: Record<string, string> = {
    work_orders: '/fm/work-orders',
    properties: '/fm/properties',
    units: '/fm/units',
    tenants: '/fm/tenants',
    vendors: '/souq/vendors',
    invoices: '/finance/invoices',
    products: '/souq/products',
    services: '/souq/services',
    rfqs: '/souq/rfqs',
    orders: '/souq/orders',
    listings: '/aqar/listings',
    projects: '/aqar/projects',
    agents: '/aqar/agents'
  };
  
  const basePath = baseRoutes[entity] || '/dashboard';
  return `${basePath}?highlight=${id}`;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user?.orgId) {
      return NextResponse.json(
        { error: 'Tenant context required', correlationId: crypto.randomUUID() },
        { status: 401 }
      );
    }

    const mongoose = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const app = (searchParams.get('app') || 'fm') as AppKey;
    const q = (searchParams.get('q') || '').trim();
    const entities = (searchParams.get('entities') || '').split(',').filter(Boolean);

    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const appConfig = APPS[app];
    if (!appConfig) {
      return NextResponse.json({ results: [] });
    }

    const searchEntities = entities.length > 0 ? entities : appConfig.searchEntities;
    const results: any[] = [];

    // Search across different entity types based on app with tenant isolation
    for (const entity of searchEntities) {
      try {
        let collection: any;
        let searchQuery: any = {
          orgId: user.orgId,
          $text: { $search: q },
          deletedAt: { $exists: false }
        };
        let projection: any = { score: { $meta: 'textScore' } };

        const mdb = (mongoose as any).connection?.db;
        if (!mdb) continue;
        
        switch (entity) {
          case 'work_orders':
            collection = mdb.collection('work_orders');
            break;
          case 'properties':
            collection = mdb.collection('properties');
            break;
          case 'units':
            collection = mdb.collection('units');
            break;
          case 'tenants':
            collection = mdb.collection('tenants');
            break;
          case 'vendors':
            collection = mdb.collection('vendors');
            break;
          case 'invoices':
            collection = mdb.collection('invoices');
            break;
          case 'products':
            collection = mdb.collection('products');
            break;
          case 'services':
            collection = mdb.collection('services');
            break;
          case 'rfqs':
            collection = mdb.collection('rfqs');
            break;
          case 'orders':
            collection = mdb.collection('orders');
            break;
          case 'listings':
            collection = mdb.collection('listings');
            break;
          case 'projects':
            collection = mdb.collection('projects');
            break;
          case 'agents':
            collection = mdb.collection('agents');
            break;
          default:
            continue;
        }

        if (collection) {
          const items = await collection
            .find(searchQuery)
            .project(projection)
            .sort({ score: { $meta: 'textScore' } })
            .limit(5)
            .toArray();

          items.forEach((item: any) => {
            const result = {
              id: item._id?.toString() || '',
              entity,
              title: item.title || item.name || item.code || `Untitled ${entity}`,
              subtitle: item.description || item.address || item.status || '',
              href: generateHref(entity, item._id?.toString() || ''),
              score: item.score || 0
            };
            results.push(result);
          });
        }
      } catch (error) {
        console.warn(`Search failed for entity ${entity}:`, error);
      }
    }

    // Sort by score and limit results
    results.sort((a, b) => (b.score || 0) - (a.score || 0));
    return NextResponse.json({ results: results.slice(0, 20) });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed', correlationId: crypto.randomUUID() },
      { status: 500 }
    );
  }
}
