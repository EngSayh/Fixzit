import { getDatabase } from "@/lib/mongodb-unified";
import { embedText } from "@/lib/ai-embeddings/embeddings";
import { chunkText } from "./chunk";

type UpsertArgs = {
  orgId: string | null;
  tenantId?: string | null;
  articleId: string;
  lang?: string;
  roleScopes?: string[];
  route?: string;
  title?: string;
  content: string;
};

export async function upsertArticleEmbeddings(args: UpsertArgs) {
  const db = await getDatabase();
  const coll = db.collection("kb_embeddings");
  const { articleId, content, lang, roleScopes, route, orgId, tenantId } = args;
  const chunks = chunkText(content, 1200, 200);
  const ops: Array<{
    updateOne: {
      filter: Record<string, unknown>;
      update: Record<string, unknown>;
      upsert: boolean;
    };
  }> = [];
  let index = 0;
  for (const chunk of chunks) {
    const embedding = await embedText(chunk.text);
    ops.push({
      updateOne: {
        filter: {
          articleId,
          chunkId: index,
          tenantId: tenantId ?? null,
          orgId: orgId ?? null,
        },
        update: {
          $set: {
            articleId,
            chunkId: index,
            text: chunk.text,
            embedding,
            lang: lang || "en",
            route: route || "/help",
            roleScopes: roleScopes && roleScopes.length ? roleScopes : ["USER"],
            orgId: orgId ?? null,
            tenantId: tenantId ?? null,
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    });
    index += 1;
  }
  if (ops.length) await coll.bulkWrite(ops, { ordered: false });
}

export async function deleteArticleEmbeddings(
  articleId: string,
  tenantId: string | null,
) {
  const db = await getDatabase();
  const coll = db.collection("kb_embeddings");
  await coll.deleteMany({ articleId, tenantId });
}
