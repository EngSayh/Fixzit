import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/lib/mongo';

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