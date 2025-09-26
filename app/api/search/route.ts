import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId, Db } from 'mongodb';

import { APPS, AppKey, SearchEntity } from '@/src/config/topbar-modules';
import { getNativeDb, isMockDB } from '@/src/lib/mongo';
import { verifyToken } from '@/src/lib/auth';

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
    const context = await resolveRequestContext(req);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const nativeDb = await getNativeDb();

    if (!nativeDb) {
      if (isMockDB) {
        console.warn('Search API running without MongoDB (USE_MOCK_DB=true); returning empty results.');
        return NextResponse.json({ results: [] });
      }

      console.error('Search API error: MongoDB connection unavailable');
      return NextResponse.json({ results: [] }, { status: 503 });
    }
    const { searchParams } = new URL(req.url);
    const app = (searchParams.get('app') || 'fm') as AppKey;
    const q = (searchParams.get('q') || '').trim();
    const entityOverrides = (searchParams.get('entities') || '')
      .split(',')
      .map(value => normalizeSearchEntity(value))
      .filter((value): value is SearchEntity => value !== null);
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