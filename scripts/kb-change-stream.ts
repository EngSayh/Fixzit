import { MongoClient } from "mongodb";
import "dotenv/config";
import { embedText } from "@/ai/embeddings";
import { chunkText } from "@/kb/chunk";

async function run() {
  const uri = process.env.MONGODB_URI as string;
  if (!uri) throw new Error("MONGODB_URI not set");
  const client = new MongoClient(uri);
  await client.connect();
  const dbName =
    (new URL(uri).pathname || "/").slice(1) ||
    process.env.MONGODB_DB ||
    undefined;
  const db = dbName ? client.db(dbName) : client.db();
  const articles = db.collection("helparticles");
  const kb = db.collection("kb_embeddings");
  console.log("KB Change Stream watcher started…");
  interface ChangeEvent {
    operationType: string;
    fullDocument?: {
      slug?: string;
      content?: string;
      status?: string;
      lang?: string;
    };
  }

  const stream = articles.watch([], { fullDocument: "updateLookup" });
  stream.on("change", async (ev: ChangeEvent) => {
    try {
      if (!["insert", "update", "replace"].includes(ev.operationType)) return;
      const doc = ev.fullDocument;
      if (!doc || doc.status !== "PUBLISHED") return;
      const articleId = doc.slug;
      const content = String(doc.content || "");
      const chunks = chunkText(content, 1200, 200);
      const ops: Array<{
        updateOne: {
          filter: Record<string, unknown>;
          update: Record<string, unknown>;
          upsert: boolean;
        };
      }> = [];
      let idx = 0;
      for (const c of chunks) {
        const emb = await embedText(c.text);
        ops.push({
          updateOne: {
            filter: { articleId, chunkId: idx },
            update: {
              $set: {
                articleId,
                chunkId: idx,
                text: c.text,
                embedding: emb,
                route: `/help/${articleId}`,
                lang: doc.lang || "en",
                roleScopes: ["USER"],
                updatedAt: new Date(),
              },
            },
            upsert: true,
          },
        });
        idx += 1;
      }
      if (ops.length) await kb.bulkWrite(ops, { ordered: false });
      console.log(
        `Upserted embeddings for ${articleId} (chunks=${ops.length})`,
      );
    } catch (e) {
      console.warn("KB watcher error:", e);
    }
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
