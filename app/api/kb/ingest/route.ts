import { NextRequest } from "next/server";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { upsertArticleEmbeddings, deleteArticleEmbeddings } from "@/kb/ingest";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildRateLimitKey } from "@/server/security/rateLimitKey";

import { logger } from "@/lib/logger";
/**
 * @openapi
 * /api/kb/ingest:
 *   get:
 *     summary: kb/ingest operations
 *     tags: [kb]
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
  try {
    const user = await getSessionUser(req).catch(() => null);
    if (!user || !["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      return createSecureResponse({ error: "Forbidden" }, 403, req);
    }
    const rl = await smartRateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    const body = await req.json().catch(() => ({}) as unknown);
    const { articleId, content, lang, roleScopes, route } = body || {};
    if (!articleId || typeof content !== "string") {
      return createSecureResponse(
        { error: "Missing articleId or content" },
        400,
        req,
      );
    }
    await upsertArticleEmbeddings({
      orgId: user.tenantId || null,
      tenantId: user.tenantId || null,
      articleId,
      lang: typeof lang === "string" ? lang : undefined,
      roleScopes: Array.isArray(roleScopes) ? roleScopes : undefined,
      route: typeof route === "string" ? route : undefined,
      content,
    });
    return createSecureResponse({ ok: true }, 200, req);
  } catch (err) {
    logger.error(
      "kb/ingest error",
      err instanceof Error ? err : new Error(String(err)),
      { route: "POST /api/kb/ingest" },
    );
    return createSecureResponse({ error: "Ingest failed" }, 500, req);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser(req).catch(() => null);
    if (!user || !["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN"].includes(user.role)) {
      return createSecureResponse({ error: "Forbidden" }, 403, req);
    }
    const rl = await smartRateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    const url = new URL(req.url);
    const articleId = url.searchParams.get("articleId");
    if (!articleId)
      return createSecureResponse({ error: "Missing articleId" }, 400, req);
    await deleteArticleEmbeddings(articleId, user.tenantId || null);
    return createSecureResponse({ ok: true }, 200, req);
  } catch {
    return createSecureResponse({ error: "Delete failed" }, 500, req);
  }
}
