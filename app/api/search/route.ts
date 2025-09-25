import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId, Db } from 'mongodb';

import { APPS, AppKey, SearchEntity } from '@/src/config/topbar-modules';
import type { Role } from '@/src/lib/rbac';
import { getNativeDb } from '@/src/lib/mongo';

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

type SearchRole = Role | 'STAFF';

const ALL_ROLES: SearchRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'STAFF',
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

const APP_ALLOWED_ROLES: Record<AppKey, SearchRole[]> = {
  fm: [
    'SUPER_ADMIN',
    'ADMIN',
    'STAFF',
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
  souq: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CORPORATE_ADMIN', 'PROCUREMENT', 'FM_MANAGER', 'VENDOR', 'CUSTOMER'],
  aqar: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CORPORATE_ADMIN', 'FM_MANAGER', 'OWNER', 'CUSTOMER']
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

const TENANT_FIELD_CANDIDATES = [
  'tenantId',
  'tenant_id',
  'tenant',
  'tenantKey',
  'orgId',
  'org_id',
  'org',
  'organizationId',
  'organization_id',
  'ownerOrgId',
  'platformOrgId'
] as const;

const ORG_FIELD_CANDIDATES = [
  'orgId',
  'org_id',
  'org',
  'organizationId',
  'organization_id',
  'platformOrgId',
  'ownerOrgId'
] as const;

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
  role: SearchRole;
  userId?: string;
  orgId: ObjectId | null;
  fallbackOrgId: ObjectId | null;
}

function normalizeRole(value?: string | null): SearchRole | null {
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

function ensureRoleAllowed(app: AppKey, role: SearchRole): boolean {
  const allowed = APP_ALLOWED_ROLES[app];
  return allowed.includes(role);
}

export async function GET(req: NextRequest) {
  try {
    const context = resolveRequestContext(req);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const nativeDb = await getNativeDb();

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

  const scopeClauses = buildScopeClauses(entity, context);
  if (scopeClauses === null) {
    return { collection: null, query: baseQuery };
  }

  if (scopeClauses.length === 0) {
    return { collection, query: baseQuery };
  }

  return { collection, query: { $and: [baseQuery, ...scopeClauses] } };
}

type ScopeValue = string | ObjectId;

function buildScopeClauses(entity: SearchEntity, context: RequestContext): Record<string, any>[] | null {
  const clauses: Record<string, any>[] = [];

  if (TENANT_SCOPED_ENTITIES.has(entity)) {
    const tenantClause = buildTenantScopeClause(context);
    if (!tenantClause) {
      return null;
    }
    clauses.push(tenantClause);
  }

  if (ORG_SCOPED_ENTITIES.has(entity)) {
    const orgClause = buildOrgScopeClause(context);
    if (!orgClause) {
      return null;
    }
    clauses.push(orgClause);
  }

  return clauses;
}

function buildTenantScopeClause(context: RequestContext): Record<string, any> | null {
  const values: ScopeValue[] = [];

  pushScopeValue(values, context.tenantId);
  pushObjectIdVariants(values, context.tenantObjectId);
  pushObjectIdVariants(values, context.orgId);
  pushObjectIdVariants(values, context.fallbackOrgId);

  return buildScopeDisjunction(TENANT_FIELD_CANDIDATES, values);
}

function buildOrgScopeClause(context: RequestContext): Record<string, any> | null {
  const values: ScopeValue[] = [];

  pushObjectIdVariants(values, context.orgId);
  pushObjectIdVariants(values, context.fallbackOrgId);
  pushScopeValue(values, context.tenantId);

  return buildScopeDisjunction(ORG_FIELD_CANDIDATES, values);
}

function buildScopeDisjunction(fields: readonly string[], values: ScopeValue[]): Record<string, any> | null {
  if (values.length === 0) {
    return null;
  }

  const uniqueFields = [...new Set(fields)].filter(field => field && field.trim().length > 0);
  if (uniqueFields.length === 0) {
    return null;
  }

  const clauseValue = values.length === 1 ? values[0] : { $in: values };
  const orConditions = uniqueFields.map(field => ({ [field]: clauseValue }));

  return orConditions.length > 0 ? { $or: orConditions } : null;
}

function pushObjectIdVariants(target: ScopeValue[], value: ObjectId | null) {
  if (!value) {
    return;
  }

  pushScopeValue(target, value);
  try {
    pushScopeValue(target, value.toHexString());
  } catch (_) {
    // Ignore conversion errors – ObjectId-like values may not expose toHexString
  }
}

function pushScopeValue(target: ScopeValue[], candidate?: string | ObjectId | null) {
  if (candidate == null) {
    return;
  }

  if (typeof candidate === 'string') {
    const trimmed = candidate.trim();
    if (!trimmed) {
      return;
    }
    if (!target.some(value => typeof value === 'string' && value === trimmed)) {
      target.push(trimmed);
    }
    return;
  }

  if (!target.some(value => value instanceof ObjectId && value.equals(candidate))) {
    target.push(candidate);
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