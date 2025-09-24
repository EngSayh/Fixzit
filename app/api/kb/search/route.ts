import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/lib/mongo';

// Force dynamic rendering to avoid client-side issues
export const dynamic = 'force-dynamic';

/**
 * POST route handler that performs a vector search against the KB embeddings collection.
 *
 * Expects the incoming request JSON body to contain:
 * - `qVec` (number[]): query embedding vector
 * - `orgId` (string): organization identifier
 * - `lang` (string): language code
 * - `role` (string): role used to filter `roleScopes`
 * - optional `route` (string): additional route filter
 * - optional `limit` (number, default 8): maximum results to return
 *
 * Validates required fields and returns 400 JSON `{ error: 'Missing params' }` when any required value is absent.
 * Executes a MongoDB aggregation with a $vectorSearch stage (index from KB_VECTOR_INDEX or `'kb-embeddings-index'`),
 * applies the constructed filter, and projects `articleId`, `chunkId`, `text`, `route`, `roleScopes`, and the
 * vector search score as `score`.
 *
 * @param req - Incoming NextRequest whose JSON body contains the query parameters described above.
 * @returns A NextResponse JSON object `{ results: docs }` where `docs` is an array of matched documents with scores,
 *          or a 400 error response when required params are missing.
 */
export async function POST(req: NextRequest) {
  const { qVec, orgId, lang, role, route, limit = 8 } = await req.json();
  if (!qVec || !orgId || !lang || !role) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }
  const db = await getDb();
  const coll = (db as any).connection?.db?.collection('kb_embeddings') || (db as any).db?.collection('kb_embeddings');

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
