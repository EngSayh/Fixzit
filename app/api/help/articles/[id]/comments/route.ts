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
import { parseBodySafe } from "@/lib/api/parse-body";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";
import { createSecureResponse } from "@/server/security/headers";
import { validationError } from "@/server/utils/errorResponses";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { helpArticleService } from "@/services/help/help-article-service";

const commentSchema = z.object({
  comment: z.string().min(1).max(2000),
});

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

    const { data: payload, error: parseError } = await parseBodySafe(req, { logPrefix: "[help:comments:create]" });
    if (parseError) {
      return createSecureResponse({ error: "Invalid request body" }, 400, req);
    }
    const data = commentSchema.parse(payload);

    // TD-001: Migrated from db.collection() to Mongoose service
    const articleInfo = await helpArticleService.getArticleBasicInfo(params.id, user.orgId);
    if (!articleInfo) {
      return createSecureResponse({ error: "Article not found" }, 404, req);
    }
    if (articleInfo.status !== "PUBLISHED") {
      return createSecureResponse(
        { error: "Comments are allowed only on published articles" },
        403,
        req,
      );
    }

    // Comments collection still uses native driver (no Mongoose model yet)
    const db = await getDatabase();
    const comments = db.collection(COLLECTIONS.HELP_COMMENTS);

    const now = new Date();
    await comments.insertOne({
      articleSlug: articleInfo.slug,
      orgId: articleInfo.orgId ?? user.orgId ?? null,
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

/**
 * GET /api/help/articles/:id/comments
 * Returns paginated comments for a help article
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const user = await getSessionUser(req);
    if (!user) {
      return createSecureResponse({ error: "Unauthorized" }, 401, req);
    }

    // TD-001: Migrated from db.collection() to Mongoose service
    const articleInfo = await helpArticleService.getArticleBasicInfo(params.id, user.orgId);
    if (!articleInfo) {
      return createSecureResponse({ error: "Article not found" }, 404, req);
    }

    // Pagination
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    // Comments collection still uses native driver (no Mongoose model yet)
    const db = await getDatabase();
    const comments = db.collection(COLLECTIONS.HELP_COMMENTS);

    // Fetch comments for this article (tenant-scoped via article filter)
    // PLATFORM-WIDE: Comments are fetched by articleSlug (article already tenant-scoped)
     
    const [items, total] = await Promise.all([
      // eslint-disable-next-line local/require-tenant-scope -- FALSE POSITIVE: scoped via articleSlug
      comments
        .find({ articleSlug: articleInfo.slug })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .project({ _id: 1, userId: 1, comment: 1, createdAt: 1 })
        .toArray(),
      // eslint-disable-next-line local/require-tenant-scope -- FALSE POSITIVE: scoped via articleSlug
      comments.countDocuments({ articleSlug: articleInfo.slug }),
    ]);

    return createSecureResponse(
      {
        ok: true,
        data: items,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      200,
      req,
    );
  } catch (err: unknown) {
    logger.error("GET /api/help/articles/[id]/comments failed", err);
    return createSecureResponse({ error: "Internal Server Error" }, 500, req);
  }
}
