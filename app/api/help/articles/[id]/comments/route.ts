/**
 * @fileoverview Help Article Comments API
 * @description Manages user comments on help articles for feedback
 * and community assistance.
 * 
 * @module api/help/articles/[id]/comments
 * @requires Authenticated user
 * 
 * @endpoints
 * - GET /api/help/articles/:id/comments - List comments on an article
 * - POST /api/help/articles/:id/comments - Add a comment to an article
 * 
 * @params
 * - id: Article ID (ObjectId) or slug
 * 
 * @requestBody (POST)
 * - comment: (required) Comment text (1-2000 chars)
 * 
 * @validation
 * - Article must exist and be accessible to user's org
 * - Article must be in PUBLISHED status
 * - Comment length: 1-2000 characters
 * 
 * @security
 * - Authenticated users only
 * - Tenant-scoped: Comments isolated by organization
 * - Secure response headers applied
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";
import { ObjectId } from "mongodb";
import { createSecureResponse } from "@/server/security/headers";
import { validationError } from "@/server/utils/errorResponses";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const commentSchema = z.object({
  comment: z.string().min(1).max(2000),
});

const buildArticleFilter = (id: string, orgId?: string | null) => {
  const base = (() => {
    try {
      return { _id: new ObjectId(id) };
    } catch {
      return { slug: id };
    }
  })();
  const tenantScope = {
    $or: [{ orgId }, { orgId: { $exists: false } }, { orgId: null }],
  };
  return { ...base, ...tenantScope };
};

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const rateLimitResponse = enforceRateLimit(req, { requests: 20, windowMs: 60_000, keyPrefix: "help:comments:create" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const params = await props.params;
    const user = await getSessionUser(req);
    if (!user) {
      return createSecureResponse({ error: "Unauthorized" }, 401, req);
    }

    const payload = await req.json().catch(() => ({}));
    const data = commentSchema.parse(payload);

    const db = await getDatabase();
  const articles = db.collection(COLLECTIONS.HELP_ARTICLES);
  const comments = db.collection(COLLECTIONS.HELP_COMMENTS);

    const articleFilter = buildArticleFilter(params.id, user.orgId);
    const article = await articles.findOne(articleFilter, {
      projection: { slug: 1, status: 1, orgId: 1 },
    });
    if (!article) {
      return createSecureResponse({ error: "Article not found" }, 404, req);
    }
    if (article.status !== "PUBLISHED") {
      return createSecureResponse(
        { error: "Comments are allowed only on published articles" },
        403,
        req,
      );
    }

    const now = new Date();
    await comments.insertOne({
      articleSlug: article.slug,
      orgId: article.orgId ?? user.orgId ?? null,
      userId: user.id,
      comment: data.comment.trim(),
      createdAt: now,
    });

    const response = NextResponse.json({
      ok: true,
      createdAt: now.toISOString(),
    });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "name" in err &&
      err.name === "ZodError" &&
      "issues" in err
    ) {
      return validationError(
        "Validation failed",
        err.issues as Array<{ message: string }>,
      );
    }
    logger.error("POST /api/help/articles/[id]/comments failed", err);
    return createSecureResponse({ error: "Internal Server Error" }, 500, req);
  }
}
