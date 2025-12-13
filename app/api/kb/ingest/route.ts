/**
 * @fileoverview Knowledge Base Ingest API
 * @description Ingests and manages article embeddings for the knowledge base vector search system.
 * @route POST /api/kb/ingest - Create/update article embeddings
 * @route DELETE /api/kb/ingest - Remove article embeddings
 * @access Authenticated (SUPER_ADMIN, ADMIN only)
 * @module kb
 */
import { NextRequest } from "next/server";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { upsertArticleEmbeddings, deleteArticleEmbeddings } from "@/kb/ingest";
import { parseBodySafe } from "@/lib/api/parse-body";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";

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
    const sessionResult = await getSessionOrNull(req, { route: "kb:ingest" });
    if (!sessionResult.ok) {
      return sessionResult.response; // 503 on infra error
    }
    const user = sessionResult.session;
    if (!user || !["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      return createSecureResponse({ error: "Forbidden" }, 403, req);
    }
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    const { data: body, error: parseError } = await parseBodySafe<{
      articleId?: string;
      content?: string;
      lang?: string;
      roleScopes?: string[];
      route?: string;
    }>(req, { logPrefix: "[kb:ingest]" });
    if (parseError) {
      return createSecureResponse({ error: "Invalid request body" }, 400, req);
    }
    const { articleId, content, lang, roleScopes, route } = body ?? {};
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
    const sessionResult = await getSessionOrNull(req, { route: "kb:ingest:delete" });
    if (!sessionResult.ok) {
      return sessionResult.response; // 503 on infra error
    }
    const user = sessionResult.session;
    if (!user || !["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN"].includes(user.role)) {
      return createSecureResponse({ error: "Forbidden" }, 403, req);
    }
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
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
