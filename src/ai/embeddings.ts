// AI embeddings provider (pluggable)
export async function embedText(text: string, model: 'text-embedding-3-large' | 'text-embedding-3-small' = 'text-embedding-3-large') {
  if (process.env.KB_EMBEDDING_PROVIDER !== 'openai') {
    throw new Error('Only OpenAI provider implemented in this drop.');
  }
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ input: text, model })
  });
  if (!res.ok) throw new Error(`Embedding error: ${res.status}`);
  const json = await res.json();
  return json.data[0].embedding as number[];
}
