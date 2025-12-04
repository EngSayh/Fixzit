import "dotenv/config";
import "tsx/register";
import { embedText } from "@/ai/embeddings";
import { chunkText } from "@/kb/chunk";
import { getDatabase, disconnectFromDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";

async function run() {
  const db = await getDatabase();
  const articles = db.collection(COLLECTIONS.HELP_ARTICLES);
  const kb = db.collection(COLLECTIONS.KB_EMBEDDINGS);
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
  disconnectFromDatabase().finally(() => process.exit(1));
});
