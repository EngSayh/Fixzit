import { NextRequest, NextResponse } from 'next/server';
import { embedText } from '@/src/ai/embeddings';
import { getDb } from '@/src/lib/mongo';

// Force dynamic rendering to avoid client-side issues
export const dynamic = 'force-dynamic';

async function synthesizeAnswer(contextChunks: string[], question: string, lang: 'ar' | 'en') {
  // Simple provider-agnostic call; example uses OpenAI Chat Completions
  const sysPrompt = lang === 'ar'
    ? 'أجب بإيجاز وبالدقة استنادًا فقط إلى السياق المقدم. أدرج "المراجع" في النهاية.'
    : 'Answer concisely and precisely based ONLY on the provided context. Append "Sources" at the end.';

  const messages = [
    { role: 'system', content: sysPrompt },
    { role: 'user', content: `Question: ${question}\n\nContext:\n${contextChunks.join('\n---\n')}` }
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature: 0.1 })
  });
  if (!res.ok) throw new Error(`LLM error: ${res.status}`);
  const json = await res.json();
  return json.choices[0].message.content as string;
}

export async function POST(req: NextRequest) {
  const { question, orgId, lang, role, route } = await req.json();
  if (!question || !orgId || !lang || !role) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  // 1) Embed the question
  const qVec = await embedText(question);

  // 2) Search
  const searchRes = await fetch(new URL('/api/kb/search', req.nextUrl).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qVec, orgId, lang, role, route, limit: 8 })
  });
  const { results } = await searchRes.json();

  // 3) Fetch article chunks for context (or use returned text directly)
  const context = results?.map((r: any) => r.text) || [];

  // 4) Synthesize
  const answer = await synthesizeAnswer(context, question, lang);
  return NextResponse.json({ answer, sources: results?.map((r: any) => ({ articleId: r.articleId, score: r.score })) });
}
