import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { APPS, AppKey } from '@/config/topbar-modules';

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

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

/**
 * @openapi
 * /api/search:
 *   get:
 *     summary: search operations
 *     tags: [search]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.ip || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    const mongoose = await connectToDatabase(); // Ensure database connection
    const { searchParams } = new URL(req.url);
    const app = (searchParams.get('app') || 'fm') as AppKey;
    const q = (searchParams.get('q') || '').trim();
    const entities = (searchParams.get('entities') || '').split(',').filter(Boolean);

    if (!q) {
      return createSecureResponse({ results: [] }, 200, req);
    }

    const appConfig = APPS[app];
    if (!appConfig) {
      return createSecureResponse({ results: [] }, 200, req);
    }

    const searchEntities = entities.length > 0 ? entities : appConfig.searchEntities;
    const results: any[] = [];

    // Search across different entity types based on app
    for (const entity of searchEntities) {
      try {
        let collection: any;
        let searchQuery: any = { $text: { $search: q } };
        let projection: any = { score: { $meta: 'textScore' } };

        const mdb = (mongoose as any).connection?.db;
        if (!mdb) continue;
        
        switch (entity) {
          case 'work_orders':
            collection = mdb.collection('work_orders');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'properties':
            collection = mdb.collection('properties');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'units':
            collection = mdb.collection('units');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'tenants':
            collection = mdb.collection('tenants');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'vendors':
            collection = mdb.collection('vendors');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'invoices':
            collection = mdb.collection('invoices');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'products':
            collection = mdb.collection('products');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'services':
            collection = mdb.collection('services');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'rfqs':
            collection = mdb.collection('rfqs');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'orders':
            collection = mdb.collection('orders');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'listings':
            collection = mdb.collection('listings');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'projects':
            collection = mdb.collection('projects');
            searchQuery = { 
              $text: { $search: q },
              deletedAt: { $exists: false }
            };
            break;
          case 'agents':
            collection = mdb.collection('agents');
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
    return createSecureResponse({ results: [] }, 500, req);
  }
}

