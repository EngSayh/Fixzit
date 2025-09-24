import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { APPS, AppKey } from '@/src/config/topbar-modules';

export async function GET(req: NextRequest) {
  try {
    await db; // Ensure database connection
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

    // Search across different entity types based on app
    for (const entity of searchEntities) {
      try {
        let collection: any;
        let searchQuery: any = { $text: { $search: q } };
        let projection: any = { score: { $meta: 'textScore' } };

        switch (entity) {
          case 'work_orders':
            collection = db.collection('work_orders');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'properties':
            collection = db.collection('properties');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'units':
            collection = db.collection('units');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'tenants':
            collection = db.collection('tenants');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'vendors':
            collection = db.collection('vendors');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'invoices':
            collection = db.collection('invoices');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'products':
            collection = db.collection('products');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'services':
            collection = db.collection('services');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'rfqs':
            collection = db.collection('rfqs');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'orders':
            collection = db.collection('orders');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'listings':
            collection = db.collection('listings');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'projects':
            collection = db.collection('projects');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'agents':
            collection = db.collection('agents');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
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
        // Continue with other entities
      }
    }

    // Sort by score and limit results
    results.sort((a, b) => (b.score || 0) - (a.score || 0));
    return NextResponse.json({ results: results.slice(0, 20) });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ results: [] }, { status: 500 });
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