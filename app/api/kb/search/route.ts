import { NextRequest} from 'next/server';
import { getDatabase } from '@/lib/mongodb-unified';
import { getSessionUser } from '@/server/middleware/withAuthRbac';

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';
import { buildRateLimitKey } from '@/server/security/rateLimitKey';

import { logger } from '@/lib/logger';
// Define proper type for search results
interface SearchResult {
  articleId: string;
  chunkId: string;
  text: string;
  lang: string;
  route: string;
  roleScopes: string[];
  slug?: string;
  title?: string;
  updatedAt?: Date;
  score?: number;
}

/**
 * POST /api/kb/search
 * Body: { query: number[] (embedding), lang?: string, role?: string, route?: string, limit?: number }
 * Returns: top-N chunks scoped by tenantId/lang/role/route with vectorSearch or lexical fallback.
 */
/**
 * @openapi
 * /api/kb/search:
 *   post:
 *     summary: kb/search operations
 *     tags: [kb]
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
export async function POST(req: NextRequest) {
  try {
    // Best-effort local rate limiting
    rateLimitAssert(req);
    const user = await getSessionUser(req).catch(() => null);
    if (!user) return createSecureResponse({ error: 'Unauthorized' }, 401, req);
    const rl = rateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    const body = await req.json().catch(() => ({}));
    const query = body?.query as number[] | undefined;
    const qText = typeof body?.q === 'string' ? body.q : undefined;
    const lang = typeof body?.lang === 'string' ? body.lang : undefined;
    const role = typeof body?.role === 'string' ? body.role : undefined;
    const route = typeof body?.route === 'string' ? body.route : undefined;
    const limitRaw = Number(body?.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(12, Math.floor(limitRaw)) : 8;
    if (!Array.isArray(query) || query.length === 0) {
      return createSecureResponse({ error: 'Missing query embedding' }, 400, req);
    }

    const db = await getDatabase();
    const coll = db.collection('kb_embeddings');

    const scope: { $and: Array<Record<string, unknown>> } = {
      $and: [
        {
          $or: [
            ...(user?.tenantId ? [ { tenantId: user.orgId } ] : []),
            { tenantId: { $exists: false } },
            { tenantId: null }
          ]
        },
      ]
    };
    if (lang) scope.$and.push({ lang });
    if (role) scope.$and.push({ roleScopes: { $in: [role] } });
    if (route) scope.$and.push({ route });

    let results: SearchResult[] = [];
    try {
      const pipe = [
        {
          $vectorSearch: {
            index: process.env.KB_VECTOR_INDEX || 'kb-embeddings-index',
            path: 'embedding',
            queryVector: query,
            numCandidates: 200,
            limit,
            filter: scope
          }
        },
        {
          $project: {
            _id: 0,
            articleId: 1,
            chunkId: 1,
            text: 1,
            lang: 1,
            route: 1,
            roleScopes: 1,
            slug: 1,
            title: 1,
            updatedAt: 1,
            score: { $meta: 'vectorSearchScore' }
          }
        }
      ];
      results = await coll.aggregate(pipe, { maxTimeMS: 3_000 }).toArray() as unknown as SearchResult[];
    } catch (vectorError) {
      logger.warn(`Vector search failed, falling back to lexical search: ${{ vectorError }}`);
      // Fallback to lexical search on text; require original question text
      const safe = new RegExp((qText || '').toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const filter = { ...scope, text: safe } as Record<string, unknown>;
      results = await coll
        .find(filter, { projection: { articleId: 1, chunkId: 1, text: 1, lang: 1, route: 1, roleScopes: 1 } })
        .limit(limit)
        .toArray() as unknown as SearchResult[];
    }

    return createSecureResponse({ results }, 200, req);
  } catch (err) {
    logger.error(
      'kb/search error',
      err instanceof Error ? err : new Error(String(err)),
      { route: 'POST /api/kb/search' }
    );
    return createSecureResponse({ error: 'Search failed' }, 500, req);
  }
}

const rateMap = new Map<string, { count: number; ts: number }>();
function rateLimitAssert(req: NextRequest) {
  const ip = getClientIP(req);
  const key = `kb:search:${ip}`;
  const now = Date.now();
  const rec = rateMap.get(key) || { count: 0, ts: now };
  if (now - rec.ts > 60_000) { rec.count = 0; rec.ts = now; }
  rec.count += 1;
  rateMap.set(key, rec);
  const MAX_RATE_PER_MIN_ENV = Number(process.env.KB_SEARCH_MAX_RATE_PER_MIN);
  const MAX_RATE_PER_MIN = Number.isFinite(MAX_RATE_PER_MIN_ENV) && MAX_RATE_PER_MIN_ENV > 0
    ? Math.floor(MAX_RATE_PER_MIN_ENV)
    : 60;
  if (rec.count > MAX_RATE_PER_MIN) throw new Error('Rate limited');
}
