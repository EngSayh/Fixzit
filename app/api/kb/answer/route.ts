import { NextRequest, NextResponse } from 'next/server';
import { embedText } from '@/src/ai/embeddings';
import { getDb } from '@/src/lib/mongo';

async function synthesizeAnswer(contextChunks: string[], question: string, lang: 'ar' | 'en') {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const sysPrompt = lang === 'ar'
    ? 'أجب بإيجاز وبالدقة استنادًا فقط إلى السياق المقدم. أدرج "المراجع" في النهاية.'
    : 'Answer concisely and precisely based ONLY on the provided context. Append "Sources" at the end.';

  const messages = [
    { role: 'system', content: sysPrompt },
    { role: 'user', content: `Question: ${question}\n\nContext:\n${contextChunks.join('\n---\n')}` }
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ 
      model: 'gpt-4o-mini', 
      messages, 
      temperature: 0.1,
      max_tokens: 500
    })
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`LLM error: ${res.status} - ${error}`);
  }
  
  const json = await res.json();
  return json.choices[0].message.content as string;
}

export async function POST(req: NextRequest) {
  try {
    const { question, orgId, lang, role, route } = await req.json();
    
    if (!question || !orgId || !lang || !role) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1) Embed the question
    const qVec = await embedText(question);

    // 2) Search for relevant chunks
    const searchRes = await fetch(new URL('/api/kb/search', req.nextUrl).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qVec, orgId, lang, role, route, limit: 8 })
    });
    
    if (!searchRes.ok) {
      throw new Error('Search failed');
    }
    
    const { results } = await searchRes.json();

    // 3) Use returned text directly as context
    const context = results?.map((r: any) => r.text) || [];

    // 4) Synthesize answer
    const answer = await synthesizeAnswer(context, question, lang);
    
    return NextResponse.json({ 
      answer, 
      sources: results?.map((r: any) => ({ 
        articleId: r.articleId, 
        score: r.score 
      })) || []
    });
  } catch (error) {
    console.error('Answer generation error:', error);
    
    // Fallback response
    const fallbackAnswer = lang === 'ar' 
      ? 'عذراً، لا أستطيع الإجابة على سؤالك في الوقت الحالي. يرجى المحاولة مرة أخرى أو إنشاء تذكرة دعم.'
      : 'Sorry, I cannot answer your question at the moment. Please try again or create a support ticket.';
    
    return NextResponse.json({ 
      answer: fallbackAnswer,
      sources: []
    });
  }
}