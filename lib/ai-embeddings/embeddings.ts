/**
 * Lightweight embedding helper using OpenAI's Embeddings API via fetch.
 * Avoids hard dependency on SDKs to keep install surface small.
 */

export type OpenAIEmbeddingModel =
  | "text-embedding-3-small"
  | "text-embedding-3-large";
const VALID_OPENAI_EMBEDDING_MODELS: OpenAIEmbeddingModel[] = [
  "text-embedding-3-small",
  "text-embedding-3-large",
];
function getValidatedEmbeddingModel(envModel?: string): OpenAIEmbeddingModel {
  return VALID_OPENAI_EMBEDDING_MODELS.includes(
    envModel as OpenAIEmbeddingModel,
  )
    ? (envModel as OpenAIEmbeddingModel)
    : "text-embedding-3-small";
}

export async function embedText(
  input: string,
  model: OpenAIEmbeddingModel = getValidatedEmbeddingModel(
    process.env.KB_EMBEDDING_MODEL,
  ),
): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input, model }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => String(res.status));
    throw new Error(`Embedding error: ${res.status} ${errText}`);
  }
  const json = (await res.json()) as { data?: Array<{ embedding?: unknown }> };
  const embed: unknown =
    json?.data && Array.isArray(json.data) ? json.data[0]?.embedding : null;
  if (!Array.isArray(embed)) {
    throw new Error("Embedding response missing embedding array");
  }
  return embed as number[];
}
