// app/api/kb/answer/route.ts - Knowledge Center RAG answer endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/lib/mongo';

async function embed(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY || '';
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text })
  });
  if (!res.ok) throw new Error(`Embedding failed: ${res.status}`);
  const json = await res.json();
  return json.data?.[0]?.embedding || [];
}

async function synthesize(question: string, chunks: string[], lang: 'ar'|'en') {
  const apiKey = process.env.OPENAI_API_KEY || '';
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  const system = lang === 'ar'
    ? 'أجب بدقة وباختصار بالاعتماد فقط على السياق. أضف قسم "المصادر" في النهاية.'
    : 'Answer concisely based ONLY on the context. Append a "Sources" section at the end.';
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: `Question: ${question}\n\nContext:\n${chunks.join('\n---\n')}` }
  ];
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature: 0.1 })
  });
  if (!res.ok) throw new Error(`LLM failed: ${res.status}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { question, orgId, lang, role, route } = await req.json();
    if (!question || !orgId || !lang || !role) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const qVec = await embed(question);
    const db = await getDb();
    // Support both mongoose connection.db and native client
    const coll: any = (db as any).connection?.db?.collection('kb_embeddings') || (db as any).db?.collection?.('kb_embeddings') || (db as any).collection?.('kb_embeddings');
    if (!coll) return NextResponse.json({ answer: '', sources: [] });

    const filter: any = { orgId, lang, roleScopes: { $in: [role] } };
    if (route) filter.route = route;

    const pipeline: any[] = [
      { $vectorSearch: { index: process.env.KB_VECTOR_INDEX || 'kb-embeddings-index', path: 'embedding', queryVector: qVec, numCandidates: 200, limit: 8 } },
      { $match: filter },
      { $project: { articleId: 1, text: 1, score: { $meta: 'vectorSearchScore' } } }
    ];
    const results = await coll.aggregate(pipeline).toArray();
    const chunks = results.map((r: any) => r.text as string);
    const answer = chunks.length ? await synthesize(question, chunks, lang) : '';
    return NextResponse.json({ answer, sources: results.map((r: any) => ({ articleId: r.articleId, score: r.score })) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'KB answer failed', answer: '', sources: [] }, { status: 500 });
  }
}
