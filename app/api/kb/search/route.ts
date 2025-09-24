import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/lib/mongo';

/**
 * POST handler that performs a vector similarity search against the `kb_embeddings` collection and returns matching chunks.
 *
 * Expects a JSON body with:
 * - `qVec` (number[]): query embedding vector (required)
 * - `orgId` (string): organization id (required)
 * - `lang` (string): language code (required)
 * - `role` (string): role used to filter `roleScopes` (required)
 * - `route` (string): optional route to further filter results
 * - `limit` (number): optional number of results to return (default: 8)
 *
 * Returns a JSON response with `results` containing documents projected with
 * `articleId`, `chunkId`, `text`, `route`, `roleScopes`, and `score` (vector search score).
 *
 * Responses:
 * - 200: { results: Array<...> } on success
 * - 400: { error: 'Missing required parameters' } when any required body field is missing
 * - 500: { error: 'Search failed', results: [] } on internal errors
 *
 * Notes:
 * - The vector search uses the MongoDB `$vectorSearch` stage and the index name is taken from
 *   the `KB_VECTOR_INDEX` environment variable or defaults to `"kb-embeddings-index"`.
 */
export async function POST(req: NextRequest) {
  try {
    const { qVec, orgId, lang, role, route, limit = 8 } = await req.json();
    
    if (!qVec || !orgId || !lang || !role) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const db = await getDb();
    const coll = db.collection('kb_embeddings');

    const filter: any = { 
      orgId, 
      lang, 
      roleScopes: { $in: [role] } 
    };
    
    if (route) {
      filter.route = route;
    }

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
          articleId: 1, 
          chunkId: 1, 
          text: 1, 
          route: 1, 
          roleScopes: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ];

    const docs = await coll.aggregate(pipe as any).toArray();
    
    return NextResponse.json({ results: docs });
  } catch (error) {
    console.error('Vector search error:', error);
    return NextResponse.json({ 
      error: 'Search failed', 
      results: [] 
    }, { status: 500 });
  }
}