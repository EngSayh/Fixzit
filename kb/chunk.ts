export type TextChunk = {
  id: string;
  text: string;
  index: number;
};

export function chunkText(
  input: string,
  chunkSize = 1000,
  overlap = 200,
): TextChunk[] {
  const text = (input || "").replace(/\r\n?/g, "\n");
  const chunks: TextChunk[] = [];
  if (!text.trim()) return chunks;
  let start = 0;
  let idx = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + chunkSize);
    const slice = text.slice(start, end);
    chunks.push({ id: `c${idx}`, text: slice, index: idx });
    idx += 1;
    if (end === text.length) break;
    start = end - overlap;
    if (start < 0) start = 0;
  }
  return chunks;
}
