// app/api/kb/answer/route.ts - Knowledge Center RAG answer endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/lib/mongo';

/**
 * Obtain an OpenAI embedding vector for the given text.
 *
 * Requests the OpenAI embeddings API (model `text-embedding-3-small`) and returns the first embedding vector.
 *
 * @param text - Input text to embed.
 * @returns The embedding vector as an array of numbers, or an empty array if the response contains no embedding.
 * @throws Error if OPENAI_API_KEY is not set or the embedding request fails (non-OK response).
 */
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

/**
 * Generates a concise answer (in English or Arabic) based solely on provided context chunks by querying OpenAI's chat API.
 *
 * The function sends a system instruction (language-specific) and a user message containing the question and the joined context chunks to an OpenAI chat model, and returns the model's text output. The returned text is expected to include a final "Sources" section as requested in the prompt.
 *
 * @param question - The user's question to be answered.
 * @param chunks - Context passages (text) that the model should use as the sole basis for the answer; these are joined with separators and provided as "Context".
 * @param lang - Response language: 'ar' for Arabic or 'en' for English; also determines the system instruction language.
 * @returns The generated answer string from the chat model, or an empty string if the model response has no content.
 * @throws If the OPENAI_API_KEY environment variable is not set.
 * @throws If the OpenAI API responds with a non-ok HTTP status (message includes the status code).
 */
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

/**
 * Handle POST requests to retrieve a RAG-style answer and source scores from the knowledge base.
 *
 * Expects a JSON body with `question`, `orgId`, `lang`, `role`, and optional `route`. Validates inputs,
 * computes an embedding for the question, searches KB embeddings (preferring Atlas Vector Search and
 * falling back to in-memory cosine ranking), synthesizes a concise answer using relevant context chunks,
 * and returns the answer together with source scores.
 *
 * If required fields are missing, responds with 400 and `{ error: 'Missing params' }`. On internal errors,
 * responds with 500 and `{ error: string, answer: '', sources: [] }`.
 *
 * @param req - Incoming NextRequest whose JSON body must include:
 *   - `question` (string): the user's question
 *   - `orgId` (string): organization identifier
 *   - `lang` ('ar' | 'en'): language for synthesis
 *   - `role` (string): role used to filter role-scoped documents
 *   - `route`? (string): optional route to further filter documents
 * @returns A NextResponse with JSON: `{ answer: string, sources: Array<{ articleId: string, score: number }>, error?: string }`.
 */
export async function POST(req: NextRequest) {
  try {
    const { question, orgId, lang, role, route } = await req.json();
    if (!question || !orgId || !lang || !role) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const qVec = await embed(question);
    const db = await getDb();
    // Support both mongoose connection.db (mongos) and native client
    const coll: any = (db as any).connection?.db?.collection('kb_embeddings') || (db as any).db?.collection?.('kb_embeddings') || (db as any).collection?.('kb_embeddings');
    if (!coll) return NextResponse.json({ answer: '', sources: [] });

    const filter: any = { orgId, lang, $or: [{ roleScopes: { $size: 0 } }, { roleScopes: { $exists: false } }, { roleScopes: { $in: [role] } }] };
    if (route) filter.route = route;

    // Try Atlas Vector Search; if not available in mongos, fallback to cosine ranking in memory
    let results: any[] = [];
    try {
      const pipeline: any[] = [
        { $vectorSearch: { index: process.env.KB_VECTOR_INDEX || 'kb-embeddings-index', path: 'embedding', queryVector: qVec, numCandidates: 400, limit: 8, filter } },
        { $project: { articleId: 1, text: 1, score: { $meta: 'vectorSearchScore' } } }
      ];
      results = await coll.aggregate(pipeline).toArray();
    } catch {
      // Fallback: sample top N docs for org/lang and rank by cosine in app
      const cursor = await coll.find({ orgId, lang }).limit(200).project({ articleId: 1, text: 1, embedding: 1 }).toArray();
      function cosine(a: number[], b: number[]) {
        const dot = a.reduce((s, v, i) => s + v * (b[i] || 0), 0);
        const na = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
        const nb = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
        return na && nb ? dot / (na * nb) : 0;
      }
      results = cursor
        .filter((r: any) => !r.roleScopes || r.roleScopes.length === 0 || r.roleScopes.includes(role))
        .map((r: any) => ({ articleId: r.articleId, text: r.text, score: cosine(qVec, r.embedding || []) }))
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 8);
    }
    const chunks = results.map((r: any) => r.text as string);
    const answer = chunks.length ? await synthesize(question, chunks, lang) : '';
    return NextResponse.json({ answer, sources: results.map((r: any) => ({ articleId: r.articleId, score: r.score })) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'KB answer failed', answer: '', sources: [] }, { status: 500 });
  }
}
