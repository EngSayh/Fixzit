import crypto from "crypto";
import { db } from "@/lib/mongo";
import {
  CopilotKnowledge,
  KnowledgeDoc,
} from "@/server/models/CopilotKnowledge";
import { CopilotSession } from "./session";
import { Types } from "mongoose";

const EMBEDDING_MODEL =
  process.env.COPILOT_EMBEDDING_MODEL || "text-embedding-3-small";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GLOBAL_KNOWLEDGE_ORG = new Types.ObjectId("000000000000000000000000");

async function callEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    // Deterministic fallback using hashing to keep behavior stable without external API.
    const hash = crypto.createHash("sha256").update(text).digest();
    const vector: number[] = [];
    for (let i = 0; i + 4 <= hash.length; i += 4) {
      vector.push(hash.readInt32BE(i) / 2 ** 16);
    }
    return vector.slice(0, 32);
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      input: text,
      model: EMBEDDING_MODEL,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding request failed: ${response.status}`);
  }

  const json = await response.json();
  return json.data?.[0]?.embedding || [];
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length) return 0;
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface RetrievedDoc {
  id: string;
  title: string;
  content: string;
  source?: string;
  score: number;
}

export async function retrieveKnowledge(
  session: CopilotSession,
  query: string,
  limit = 6,
): Promise<RetrievedDoc[]> {
  if (!query.trim()) return [];
  await db;

  const embedding = await callEmbedding(query);
  const tenantObjectId = Types.ObjectId.isValid(session.tenantId)
    ? new Types.ObjectId(session.tenantId)
    : null;

  // Enforce tenant isolation: guests only see global/public docs; authenticated users see their org + global
  const orgFilters =
    session.role === "GUEST"
      ? [{ orgId: null }, { orgId: GLOBAL_KNOWLEDGE_ORG }]
      : [
          { orgId: session.tenantId },
          ...(tenantObjectId ? [{ orgId: tenantObjectId }] : []),
          { orgId: null },
          { orgId: GLOBAL_KNOWLEDGE_ORG },
        ];

  // eslint-disable-next-line local/require-tenant-scope -- FALSE POSITIVE: orgId is in orgFilters
  const docs = await CopilotKnowledge.find({
    $and: [{ $or: orgFilters }, { locale: { $in: [session.locale, "en"] } }],
  }).lean<KnowledgeDoc[]>();

  const filtered = docs.filter((doc) => {
    if (doc.roles?.length) {
      return doc.roles.includes(session.role);
    }
    return true;
  });

  const scored = filtered.map((doc) => ({
    id: doc.slug,
    title: doc.title,
    content: doc.content,
    score: cosineSimilarity(embedding, doc.embedding || []),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter(
      (doc) =>
        doc.score > 0.05 ||
        doc.content.toLowerCase().includes(query.toLowerCase()),
    );
}

export async function upsertKnowledgeDocument(
  doc: Partial<KnowledgeDoc> & {
    slug: string;
    title: string;
    content: string;
    orgId?: string;
  },
): Promise<void> {
  await db;
  const embedding = doc.embedding?.length
    ? doc.embedding
    : await callEmbedding(doc.content);
  const orgId =
    doc.orgId && Types.ObjectId.isValid(doc.orgId)
      ? new Types.ObjectId(doc.orgId)
      : GLOBAL_KNOWLEDGE_ORG;
  // eslint-disable-next-line local/require-tenant-scope -- PLATFORM-WIDE: Knowledge base has global entries
  await CopilotKnowledge.findOneAndUpdate(
    { slug: doc.slug },
    {
      $set: {
        title: doc.title,
        content: doc.content,
        orgId,
        roles: doc.roles ?? [],
        locale: doc.locale ?? "en",
        tags: doc.tags ?? [],
        source: doc.source ?? undefined,
        embedding,
        checksum: doc.checksum,
      },
    },
    { upsert: true, new: true },
  );
}
