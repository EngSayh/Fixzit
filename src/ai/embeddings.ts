export async function embedText(text: string, model: 'text-embedding-3-large' | 'text-embedding-3-small' = 'text-embedding-3-large') {
  if (process.env.KB_EMBEDDING_PROVIDER !== 'openai') {
    throw new Error('Only OpenAI provider implemented in this drop.');
  }
  
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` 
    },
    body: JSON.stringify({ 
      input: text, 
      model,
      encoding_format: "float"
    })
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Embedding error: ${res.status} - ${error}`);
  }
  
  const json = await res.json();
  return json.data[0].embedding as number[];
}

export function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length + 1 <= maxChunkSize) {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk + '.');
        currentChunk = trimmedSentence;
      } else {
        chunks.push(trimmedSentence + '.');
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk + '.');
  }
  
  return chunks;
}