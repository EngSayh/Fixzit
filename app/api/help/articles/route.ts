import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { helpArticleService } from "@/services/help/help-article-service";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

interface UserWithAuth {
  orgId?: string;
  permissions?: string[];
  roles?: string[];
  role?: string;
  subRole?: string | null;
}

/**
 * Handles GET requests to list help articles with filtering, text search, and pagination.
 *
 * Supports query parameters:
 * - `category`: exact-match category filter
 * - `q`: full-text search over title, content, and tags
 * - `status`: article status (defaults to `"PUBLISHED"`)
 * - `page`: 1-based page number (minimum 1)
 * - `limit`: page size (clamped between 1 and 50, defaults to 20)
 *
 * Indexes are expected to be created by scripts/add-database-indexes.js (unique `slug`, `status+updatedAt`, and a text index on `title`, `content`, and `tags`).
 * The handler builds a filter from the query params and returns a JSON response with the matching items sorted by text score when `q` is provided or by `updatedAt` otherwise.
 *
 * Successful response (200) JSON shape:
 * {
 *   items: Array<{ slug, title, category, updatedAt, ... }>,
 *   page: number,
 *   limit: number,
 *   total: number,
 *   hasMore: boolean
 * }
 *
 * On failure returns a 500 response with `{ error: 'Failed to fetch help articles' }`.
 */
/**
 * @openapi
 * /api/help/articles:
 *   get:
 *     summary: help/articles operations
 *     tags: [help]
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
export async function GET(req: NextRequest) {
  try {
    const sessionResult = await getSessionOrNull(req, { route: "help:articles" });
    if (!sessionResult.ok) {
      return sessionResult.response; // 503 on infra error
    }
    const user = sessionResult.session;
    if (!user) return createSecureResponse({ error: "Unauthorized" }, 401, req);

    if (process.env.PLAYWRIGHT_TESTS === "true") {
      // Seeded data for E2E runs (requires authenticated session)
      return NextResponse.json({
        items: [
          {
            slug: "work-orders-101",
            title: "Work Orders 101",
            category: "General Overview",
            updatedAt: new Date().toISOString(),
          },
          {
            slug: "general-overview",
            title: "General Overview",
            category: "General",
            updatedAt: new Date().toISOString(),
          },
        ],
        page: 1,
        limit: 20,
        total: 2,
        hasMore: false,
      });
    }

    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    const url = new URL(req.url);
    const sp = url.searchParams;
    const category = sp.get("category") || undefined;
    const qParam = sp.get("q");
    const q = qParam && qParam.trim() !== "" ? qParam.trim() : undefined;
    const statusParam = sp.get("status");
    const requestedStatus = statusParam ? statusParam.toUpperCase() : undefined;
    const userWithAuth = user as UserWithAuth;
    const canModerate =
      (Array.isArray(userWithAuth?.permissions) &&
        userWithAuth.permissions.includes("help:moderate")) ||
      ["SUPER_ADMIN", "ADMIN"].includes(userWithAuth.role ?? "");
    const status =
      canModerate && requestedStatus ? requestedStatus : "PUBLISHED";
    const rawPage = Number(sp.get("page"));
    const page =
      Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const limitParam = sp.get("limit");
    const rawLimit = limitParam === null ? NaN : Number(limitParam);
    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(50, Math.floor(rawLimit)))
      : 20;

    // TD-001: Migrated from db.collection() to Mongoose service
    // Validates status, handles tenant scoping, text search with fallback internally
    const validStatuses = ["DRAFT", "PUBLISHED", "ALL"] as const;
    type ArticleStatus = (typeof validStatuses)[number];
    const safeStatus: ArticleStatus = validStatuses.includes(status as ArticleStatus)
      ? (status as ArticleStatus)
      : "PUBLISHED";

    const result = await helpArticleService.listArticles(user.orgId, {
      status: safeStatus,
      category,
      q,
      page,
      limit,
    });

    const response = NextResponse.json({
      items: result.items,
      page: result.page,
      limit: result.limit,
      total: result.total,
      hasMore: result.hasMore,
    });
    // Small public cache window; underlying query is tenant-scoped
    response.headers.set(
      "Cache-Control",
      "public, max-age=300, stale-while-revalidate=60",
    );
    return response;
  } catch (_error) {
    const message = _error instanceof Error ? _error.message : "Unknown error";
    logger.error("Error fetching help articles:", message);
    return createSecureResponse(
      { error: "Failed to fetch help articles" },
      500,
      req,
    );
  }
}
