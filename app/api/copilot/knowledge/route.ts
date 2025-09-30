import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { upsertKnowledgeDocument } from "@/server/copilot/retrieval";

const docSchema = z.object({
  slug: z.string(),
  title: z.string(),
  content: z.string(),
  tenantId: z.string().nullable().optional(),
  roles: z.array(z.string()).optional(),
  locale: z.enum(["en", "ar"]).optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  checksum: z.string().optional()
});

const payloadSchema = z.object({
  docs: z.array(docSchema)
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.COPILOT_WEBHOOK_SECRET;
  const provided = req.headers.get("x-webhook-secret");

  if (secret && (!provided || provided !== secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const payload = payloadSchema.parse(json);

  for (const doc of payload.docs) {
    await upsertKnowledgeDocument({
      ...doc,
      tenantId: doc.tenantId || undefined
    });
  }

  return NextResponse.json({ ok: true, count: payload.docs.length });
}
