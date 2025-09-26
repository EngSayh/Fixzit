import { getDatabase } from '@/lib/mongodb';

type SearchArgs = {
  tenantId: string | null | undefined;
  query: number[];
  q?: string;
  lang?: string;
  role?: string;
  route?: string;
  limit?: number;
};

export async function performKbSearch(args: SearchArgs): Promise<any[]> {
  const { tenantId, query, q, lang, role, route } = args;
  const limit = Math.min(Math.max(args.limit ?? 8, 1), 12);
  const db = await getDatabase();
  const coll = db.collection('kb_embeddings');

  const scope: any = {
    $and: [
      { $or: [ { tenantId }, { tenantId: { $exists: false } }, { tenantId: null } ] },
    ]
  };
  if (lang) scope.$and.push({ lang });
  if (role) scope.$and.push({ roleScopes: { $in: [role] } });
  if (route) scope.$and.push({ route });

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
          articleId: 1,
          chunkId: 1,
          text: 1,
          lang: 1,
          route: 1,
          roleScopes: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ];
    const results = await (coll as any).aggregate(pipe, { maxTimeMS: 3_000 }).toArray();
    return results;
  } catch (_e) {
    // Fallback to lexical search on text when vector index not available
    const safe = new RegExp((q || '').toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const filter = { ...scope, text: safe } as any;
    const results = await coll
      .find(filter, { projection: { articleId: 1, chunkId: 1, text: 1, lang: 1, route: 1, roleScopes: 1 } })
      .limit(limit)
      .toArray();
    return results;
  }
}

