import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { upsertKnowledgeDocument } from "@/server/copilot/retrieval";

import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";

const docSchema = z.object({
  slug: z.string(),
  title: z.string(),
  content: z.string(),
  orgId: z.string().nullable().optional(),
  roles: z.array(z.string()).optional(),
  locale: z.enum(["en", "ar"]).optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  checksum: z.string().optional(),
});

const payloadSchema = z.object({
  docs: z.array(docSchema),
});

export const runtime = "nodejs";

/**
 * @openapi
 * /api/copilot/knowledge:
 *   get:
 *     summary: copilot/knowledge operations
 *     tags: [copilot]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const secret = process.env.COPILOT_WEBHOOK_SECRET;
  const provided = req.headers.get("x-webhook-secret");

  if (secret && (!provided || provided !== secret)) {
    return createSecureResponse({ error: "Unauthorized" }, 401, req);
  }

  const json = await req.json();
  const payload = payloadSchema.parse(json);

  for (const doc of payload.docs) {
    await upsertKnowledgeDocument({
      ...doc,
      orgId: doc.orgId || undefined,
    });
  }

  return NextResponse.json({ ok: true, count: payload.docs.length });
}
