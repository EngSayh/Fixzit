import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/lib/mongo';

// Force dynamic rendering to avoid client-side issues
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { qVec, orgId, lang, role, route, limit = 8 } = await req.json();
  if (!qVec || !orgId || !lang || !role) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }
  const db = await getDb();
  const coll = db.collection('kb_embeddings');

  const filter: any = { orgId, lang, roleScopes: { $in: [role] } };
  if (route) filter.route = route;

  const pipe = [
    {
      $vectorSearch: {
        index: process.env.KB_VECTOR_INDEX || 'kb-embeddings-index',
        path: 'embedding',
        queryVector: qVec,
        numCandidates: 200,
        limit
      }
    },
    { $match: filter },
    {
      $project: {
        articleId: 1, chunkId: 1, text: 1, route: 1, roleScopes: 1,
        score: { $meta: 'vectorSearchScore' }
      }
    }
  ];

  const docs = await coll.aggregate(pipe as any).toArray();
  return NextResponse.json({ results: docs });
}
