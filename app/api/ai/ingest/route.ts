// app/api/ai/ingest/route.ts - Knowledge base ingestion endpoint
import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import crypto from 'crypto';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit';
const MONGODB_DB = process.env.MONGODB_DB || 'fixzit';
const INGEST_KEY = process.env.INGEST_KEY || 'super-secret-ingest-key';

interface Document {
  id: string;
  orgId: string;
  source: string;
  text: string;
  metadata?: Record<string, any>;
}

/**
 * HTTP POST handler that ingests documents, computes embeddings, and upserts them into the `kb_embeddings` MongoDB collection.
 *
 * The handler expects a JSON body of the form `{ docs: Document[] }` and requires a valid `x-ingest-key` header that matches `INGEST_KEY`.
 * For each document it ensures an `id`, attempts to obtain an embedding from the OpenAI Embeddings API when `OPENAI_API_KEY` is set (using `EMBED_MODEL` or `text-embedding-3-small` by default), and falls back to `generateMockEmbedding` if no embedding is returned. Each processed document is normalized with `lang`, `roleScopes`, `createdAt`, and `updatedAt`, then upserted (replaceOne with upsert) keyed by `{ id, orgId }` via a MongoDB bulkWrite.
 *
 * Responds with JSON containing `success`, `processed`, `inserted`, `updated`, and `upserted` counts on success.
 *
 * Possible HTTP responses:
 * - 200: ingestion succeeded (JSON summary)
 * - 400: invalid request body (missing or non-array `docs`)
 * - 401: missing or invalid `x-ingest-key`
 * - 500: internal error during ingestion
 *
 * @returns A NextResponse with a JSON payload summarizing the ingestion result or an error object and appropriate HTTP status.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify ingest key
    const authHeader = req.headers.get('x-ingest-key');
    if (authHeader !== INGEST_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { docs }: { docs: Document[] } = await req.json();

    if (!docs || !Array.isArray(docs)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB);
    const collection = db.collection('kb_embeddings');

    // Process documents
    const processedDocs = [] as any[];
    for (const doc of docs) {
      const id = doc.id || crypto.randomUUID();
      let embedding: number[] = [];
      try {
        // Try real embeddings if OPENAI_API_KEY exists
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
          const res = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ model: process.env.EMBED_MODEL || 'text-embedding-3-small', input: doc.text })
          });
          if (res.ok) {
            const json = await res.json();
            embedding = json.data?.[0]?.embedding || [];
          }
        }
      } catch {}

      if (!embedding || embedding.length === 0) {
        embedding = generateMockEmbedding(doc.text);
      }

      processedDocs.push({
        ...doc,
        id,
        embedding,
        lang: (doc as any).metadata?.lang === 'ar' ? 'ar' : ((doc as any).metadata?.lang === 'en' ? 'en' : 'en'),
        roleScopes: Array.isArray((doc as any).metadata?.roles) ? (doc as any).metadata?.roles : [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Upsert documents
    const operations = processedDocs.map(doc => ({
      replaceOne: {
        filter: { id: doc.id, orgId: doc.orgId },
        replacement: doc,
        upsert: true
      }
    }));

    const result = await collection.bulkWrite(operations);

    await client.close();

    return NextResponse.json({
      success: true,
      processed: processedDocs.length,
      inserted: result.insertedCount,
      updated: result.modifiedCount,
      upserted: result.upsertedCount
    });

  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json(
      { error: 'Failed to ingest documents' },
      { status: 500 }
    );
  }
}

/**
 * Deterministically generates a 1536-dimensional mock embedding for the given text.
 *
 * This is a lightweight, deterministic fallback used when a real embedding service
 * (e.g., OpenAI) is unavailable. It derives values from the SHA-256 hash of `text`
 * and maps each byte to a float in the range [-0.5, 0.5], producing a stable vector
 * of length 1536 suitable as a placeholder for downstream storage or similarity ops.
 *
 * @param text - Input string to derive the mock embedding from.
 * @returns A 1536-length array of numbers representing the mock embedding.
 */
function generateMockEmbedding(text: string): number[] {
  const embedding = new Array(1536).fill(0);
  const hash = crypto.createHash('sha256').update(text).digest();
  
  for (let i = 0; i < 1536; i++) {
    embedding[i] = (hash[i % hash.length] / 255) - 0.5;
  }
  
  return embedding;
}
