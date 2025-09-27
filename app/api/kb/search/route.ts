import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getSessionUser } from '@/src/server/middleware/withAuthRbac';

/**
 * POST /api/kb/search
 * Body: { query: number[] (embedding), lang?: string, role?: string, route?: string, limit?: number }
 * Returns: top-N chunks scoped by tenantId/lang/role/route with vectorSearch or lexical fallback.
 */
export async function POST(req: NextRequest) {
  try {
    // Best-effort local rate limiting
    rateLimitAssert(req);
    const user = await getSessionUser(req).catch(() => null);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const query = body?.query as number[] | undefined;
    const qText = typeof body?.q === 'string' ? body.q : undefined;
    const lang = typeof body?.lang === 'string' ? body.lang : undefined;
    const role = typeof body?.role === 'string' ? body.role : undefined;
    const route = typeof body?.route === 'string' ? body.route : undefined;
    const limitRaw = Number(body?.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(12, Math.floor(limitRaw)) : 8;
    if (!Array.isArray(query) || query.length === 0) {
      return NextResponse.json({ error: 'Missing query embedding' }, { status: 400 });
    }

    const db = await getDatabase();
    const coll = db.collection('kb_embeddings');

    const scope: any = {
      $and: [
        {
          $or: [
            ...(user?.tenantId ? [ { tenantId: user.tenantId } ] : []),
            { tenantId: { $exists: false } },
            { tenantId: null }
          ]
        },
      ]
    };
    if (lang) scope.$and.push({ lang });
    if (role) scope.$and.push({ roleScopes: { $in: [role] } });
    if (route) scope.$and.push({ route });

    let results: any[] = [];
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
      results = await (coll as any).aggregate(pipe, { maxTimeMS: 3_000 }).toArray();
    } catch (e) {
      // Fallback to lexical search on text; require original question text
      const safe = new RegExp((qText || '').toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const filter = { ...scope, text: safe } as any;
      results = await coll
        .find(filter, { projection: { articleId: 1, chunkId: 1, text: 1, lang: 1, route: 1, roleScopes: 1 } })
        .limit(limit)
        .toArray();
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error('kb/search error', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

const rateMap = new Map<string, { count: number; ts: number }>();
function rateLimitAssert(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
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

