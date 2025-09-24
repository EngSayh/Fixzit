import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export const dynamic = 'force-dynamic';

type AskRequest = {
  question: string;
  limit?: number;
  category?: string;
};

function buildHeuristicAnswer(question: string, contexts: Array<{ title: string; text: string }>) {
  const lines: string[] = [];
  lines.push(contexts.length ? `Here is what I found about: "${question}"` : `No matching articles found for: "${question}"`);
  for (const ctx of contexts.slice(0, 3)) {
    const snippet = ctx.text
      .replace(/\s+/g, ' ')
      .slice(0, 400)
      .trim();
    lines.push(`- ${ctx.title}: ${snippet}${snippet.length === 400 ? '…' : ''}`);
  }
  return lines.join("\n");
}

async function maybeSummarizeWithOpenAI(question: string, contexts: string[]): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const messages = [
      { role: 'system', content: 'Answer concisely using ONLY the provided context. Include a short step list when relevant. English only.' },
      { role: 'user', content: `Question: ${question}\n\nContext:\n${contexts.join('\n---\n')}` }
    ];
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature: 0.1 })
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { question, limit = 5, category }: AskRequest = await req.json();
    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 });
    }

    const db = await getDatabase();
    type Doc = { slug: string; title: string; content: string; updatedAt?: Date };
    const coll = db.collection<Doc>('helparticles');

    // Ensure text index exists (idempotent)
    await coll.createIndex({ title: 'text', content: 'text', tags: 'text' });

    const filter: any = { status: 'PUBLISHED' };
    if (category) filter.category = category;

    const docs = await coll
      .find({ ...filter, $text: { $search: question } }, {
        projection: { score: { $meta: 'textScore' }, slug: 1, title: 1, content: 1, updatedAt: 1 }
      })
      .sort({ score: { $meta: 'textScore' } })
      .limit(Math.min(8, Math.max(1, limit)))
      .toArray();

    const contexts = docs.map((d: Doc) => ({ title: d.title, text: d.content || '' }));
    const contextTexts = contexts.map((c: { title: string; text: string }) => `${c.title}\n${c.text}`);

    // Try to summarize with OpenAI if configured; otherwise deterministic heuristic
    const aiAnswer = await maybeSummarizeWithOpenAI(question, contextTexts);
    const answer = aiAnswer || buildHeuristicAnswer(question, contexts);

    const citations = docs.map((d: Doc) => ({ slug: d.slug, title: d.title, updatedAt: d.updatedAt }));
    return NextResponse.json({ answer, citations });
  } catch (err) {
    console.error('help/ask error', err);
    return NextResponse.json({ error: 'Failed to generate answer' }, { status: 500 });
  }
}

