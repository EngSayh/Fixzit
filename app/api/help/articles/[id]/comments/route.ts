import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { getDatabase } from "@/lib/mongodb-unified";
import { ObjectId } from "mongodb";
import { createSecureResponse } from "@/server/security/headers";
import { validationError } from "@/server/utils/errorResponses";
import { logger } from "@/lib/logger";

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
  try {
    const params = await props.params;
    const user = await getSessionUser(req);
    if (!user) {
      return createSecureResponse({ error: "Unauthorized" }, 401, req);
    }

    const payload = await req.json().catch(() => ({}));
    const data = commentSchema.parse(payload);

    const db = await getDatabase();
    const articles = db.collection("helparticles");
    const comments = db.collection("helpcomments");

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
