/**
 * Fetches an OpenAI text embedding for the given input string.
 *
 * Sends a POST request to OpenAI's embeddings endpoint and returns the first embedding vector from the response.
 *
 * @param text - The input text to embed.
 * @param model - Embedding model to use; either `text-embedding-3-large` or `text-embedding-3-small`. Defaults to `text-embedding-3-large`.
 * @returns The embedding vector as an array of numbers.
 * @throws If the environment variable `KB_EMBEDDING_PROVIDER` is not `"openai"`.
 * @throws If `OPENAI_API_KEY` is not configured.
 * @throws If the OpenAI API responds with a non-OK HTTP status (includes status and response body in the error message).
 */
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

/**
 * Splits input text into sentence-based chunks no larger than `maxChunkSize` (by character count).
 *
 * The function breaks the text on sentence-ending punctuation (., !, ?) and assembles sentences into chunks,
 * inserting a period and space between sentences. Each returned chunk ends with a trailing period. If a single
 * sentence exceeds `maxChunkSize`, it is returned as its own chunk (and may be longer than `maxChunkSize`).
 *
 * @param text - The text to split into chunks.
 * @param maxChunkSize - Maximum allowed characters per chunk (default: 1000). Chunks aim to stay within this size but very long single sentences may exceed it.
 * @returns An array of text chunks, each ending with a period.
 */
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