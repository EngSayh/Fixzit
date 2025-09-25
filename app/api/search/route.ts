import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId, Db } from 'mongodb';

import { APPS, AppKey, SearchEntity } from '@/src/config/topbar-modules';
import type { Role } from '@/src/lib/rbac';
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

const ALL_ROLES: Role[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'CORPORATE_ADMIN',
  'FM_MANAGER',
  'FINANCE',
  'HR',
  'PROCUREMENT',
  'PROPERTY_MANAGER',
  'EMPLOYEE',
  'TECHNICIAN',
  'VENDOR',
  'CUSTOMER',
  'OWNER',
  'AUDITOR'
];

const APP_ALLOWED_ROLES: Record<AppKey, Role[]> = {
  fm: [
    'SUPER_ADMIN',
    'ADMIN',
    'CORPORATE_ADMIN',
    'FM_MANAGER',
    'FINANCE',
    'HR',
    'PROCUREMENT',
    'PROPERTY_MANAGER',
    'EMPLOYEE',
    'TECHNICIAN',
    'OWNER',
    'AUDITOR'
  ],
  souq: ['SUPER_ADMIN', 'ADMIN', 'CORPORATE_ADMIN', 'PROCUREMENT', 'FM_MANAGER', 'VENDOR', 'CUSTOMER'],
  aqar: ['SUPER_ADMIN', 'ADMIN', 'CORPORATE_ADMIN', 'FM_MANAGER', 'OWNER', 'CUSTOMER']
};

const TENANT_SCOPED_ENTITIES = new Set<SearchEntity>([
  'work_orders',
  'properties',
  'units',
  'tenants',
  'vendors',
  'invoices',
  'projects',
  'listings',
  'agents'
]);

const ORG_SCOPED_ENTITIES = new Set<SearchEntity>(['products', 'services', 'rfqs', 'orders']);

const COLLECTION_NAME: Record<SearchEntity, string> = {
  work_orders: 'work_orders',
  properties: 'properties',
  units: 'units',
  tenants: 'tenants',
  vendors: 'vendors',
  invoices: 'invoices',
  products: 'products',
  services: 'services',
  rfqs: 'rfqs',
  orders: 'orders',
  listings: 'listings',
  projects: 'projects',
  agents: 'agents'
};

interface RequestContext {
  tenantId: string;
  tenantObjectId: ObjectId | null;
  role: Role;
  userId?: string;
  orgId: ObjectId | null;
  fallbackOrgId: ObjectId | null;
}

function normalizeRole(value?: string | null): Role | null {
  if (!value) {
    return null;
  }

  const candidate = value.trim().toUpperCase().replace(/[\s-]+/g, '_') as Role;
  return ALL_ROLES.includes(candidate) ? candidate : null;
}

function toObjectId(value?: string | null): ObjectId | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    if (/^[a-f\d]{24}$/i.test(trimmed)) {
      return new ObjectId(trimmed);
    }

    const digest = crypto.createHash('sha1').update(trimmed).digest('hex');
    return new ObjectId(digest.slice(0, 24));
  } catch (error) {
    console.warn('Failed to derive ObjectId from tenant/org identifier', error);
    return null;
  }
}

function resolveRequestContext(req: NextRequest): RequestContext | null {
  try {
    const userHeader = req.headers.get('x-user');
    const parsedUser = userHeader ? JSON.parse(userHeader) : undefined;

    const headerTenant = req.headers.get('x-tenant-id') ?? req.headers.get('x-org-id');
    const cookieTenant = req.cookies.get('fixzit_org')?.value ?? req.cookies.get('fixzit_tenant')?.value;
    const userTenant = typeof parsedUser?.tenantId === 'string' ? parsedUser.tenantId : undefined;

    const tenantId = (headerTenant ?? userTenant ?? cookieTenant ?? process.env.DEFAULT_TENANT_ID ?? '').trim();

    if (!tenantId) {
      return null;
    }

    const role =
      normalizeRole(req.headers.get('x-user-role')) ||
      normalizeRole(parsedUser?.role) ||
      normalizeRole(parsedUser?.professional?.role) ||
      normalizeRole(req.headers.get('x-role')) ||
      'CUSTOMER';

    const userId = typeof parsedUser?.id === 'string' ? parsedUser.id : req.headers.get('x-user-id') ?? undefined;
    const orgId =
      toObjectId(req.headers.get('x-org-id')) ||
      toObjectId(typeof parsedUser?.orgId === 'string' ? parsedUser.orgId : undefined);

    const fallbackOrgId = toObjectId(tenantId);
    const tenantObjectId = toObjectId(tenantId);

    return {
      tenantId,
      tenantObjectId,
      role,
      userId,
      orgId,
      fallbackOrgId
    };
  } catch (error) {
    console.warn('Failed to resolve search request context', error);
    return null;
  }
}

function ensureRoleAllowed(app: AppKey, role: Role): boolean {
  const allowed = APP_ALLOWED_ROLES[app];
  return allowed.includes(role);
}

export async function GET(req: NextRequest) {
  try {
    const context = resolveRequestContext(req);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mongooseConnection = await db; // Ensure database connection
    const nativeDb: Db | null =
      mongooseConnection && typeof (mongooseConnection as any).connection?.db !== 'undefined'
        ? ((mongooseConnection as any).connection.db as Db | null)
        : null;

    if (!nativeDb) {
      console.error('Search API error: MongoDB connection unavailable');
      return NextResponse.json({ results: [] }, { status: 503 });
    }
    const { searchParams } = new URL(req.url);
    const app = (searchParams.get('app') || 'fm') as AppKey;

    if (!ensureRoleAllowed(app, context.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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

    const searchEntities = (entities.length > 0 ? entities : appConfig.searchEntities) as SearchEntity[];
    const uniqueEntities = Array.from(new Set(searchEntities)).filter(Boolean) as SearchEntity[];

    const entityQueries = uniqueEntities.map(async entity => {
      try {
        const { collection, query } = resolveCollectionAndQuery(nativeDb, entity, q, context);
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

function resolveCollectionAndQuery(connection: Db, entity: SearchEntity, q: string, context: RequestContext) {
  const collectionName = COLLECTION_NAME[entity];
  const collection = collectionName ? connection.collection(collectionName) : null;

  if (!collection) {
    return { collection: null, query: {} };
  }

  const baseQuery: Record<string, any> = {
    $text: { $search: q },
    deletedAt: { $exists: false }
  };

  const scopedQuery = applyScopeFilter(entity, baseQuery, context);
  if (!scopedQuery) {
    return { collection: null, query: baseQuery };
  }

  return { collection, query: scopedQuery };
}

function applyScopeFilter(entity: SearchEntity, baseQuery: Record<string, any>, context: RequestContext) {
  const query: Record<string, any> = { ...baseQuery };

  if (TENANT_SCOPED_ENTITIES.has(entity)) {
    const tenantFilters: (string | ObjectId)[] = [];
    if (context.tenantId) {
      tenantFilters.push(context.tenantId);
    }
    if (context.tenantObjectId) {
      tenantFilters.push(context.tenantObjectId);
    }

    if (tenantFilters.length === 0) {
      return null;
    }

    query.tenantId = tenantFilters.length === 1 ? tenantFilters[0] : { $in: tenantFilters };
  }

  if (ORG_SCOPED_ENTITIES.has(entity)) {
    const orgCandidates = [context.orgId, context.fallbackOrgId].filter(
      (value): value is ObjectId => value instanceof ObjectId
    );

    if (orgCandidates.length === 0) {
      return null;
    }

    query.orgId = orgCandidates.length === 1 ? orgCandidates[0] : { $in: orgCandidates };
  }

  return query;
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