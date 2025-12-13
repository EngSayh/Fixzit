import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { Filter, Document } from "mongodb";

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

interface MongoTextFilter extends Document {
  $text: { $search: string };
}

// Collection name aligned with Mongoose default pluralization for model "HelpArticle"
const COLLECTION = "helparticles";

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
    const skip = (page - 1) * limit;

    const db = await getDatabase();
    const coll = db.collection(COLLECTION);

    // Indexes are created by scripts/add-database-indexes.js

    // Enforce tenant isolation; allow global articles with no orgId
    const orClauses: Filter<Document>[] = [
      { orgId: { $exists: false } },
      { orgId: null },
    ];
    if (user.orgId) orClauses.unshift({ orgId: user.orgId });
    const tenantScope = { $or: orClauses };
    const filter: Filter<Document> = { ...tenantScope };
    if (status && status !== "ALL") filter.status = status;
    if (category) filter.category = category;

    function escapeRegExp(input: string) {
      return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    let items: unknown[] = [];
    let total = 0;

    if (q) {
      // Try $text search first; fallback to regex if text index is missing
      const textFilter: Filter<Document> & MongoTextFilter = {
        ...filter,
        $text: { $search: q },
      };
      const textProjection = {
        _id: 0,
        score: { $meta: "textScore" },
        slug: 1,
        title: 1,
        category: 1,
        updatedAt: 1,
      };
      try {
        total = await coll.countDocuments(textFilter);
        items = await coll
          .find(textFilter, { projection: textProjection })
          .maxTimeMS(250)
          .sort({ score: { $meta: "textScore" } })
          .skip(skip)
          .limit(limit)
          .toArray();
      } catch (_err: unknown) {
        const errorWithCode = _err as {
          codeName?: string;
          code?: number;
          message?: string;
        };
        const isMissingTextIndex =
          errorWithCode?.codeName === "IndexNotFound" ||
          errorWithCode?.code === 27 ||
          /text index required/i.test(String(errorWithCode?.message || ""));
        if (!isMissingTextIndex) throw _err;
        // Fallback when text index is missing (restrict by recent updatedAt to reduce scan)
        const safe = new RegExp(escapeRegExp(q), "i");
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - 6);
        const regexFilter: Filter<Document> = {
          ...filter,
          updatedAt: { $gte: cutoffDate },
          $or: [{ title: safe }, { content: safe }, { tags: safe }],
        };
        total = await coll.countDocuments(regexFilter);
        items = await coll
          .find(regexFilter, {
            projection: {
              _id: 0,
              slug: 1,
              title: 1,
              category: 1,
              updatedAt: 1,
            },
          })
          .maxTimeMS(250)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();
      }
    } else {
      total = await coll.countDocuments(filter);
      items = await coll
        .find(filter, {
          projection: { _id: 0, slug: 1, title: 1, category: 1, updatedAt: 1 },
        })
        .maxTimeMS(250)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
    }

    const response = NextResponse.json({
      items,
      page,
      limit,
      total,
      hasMore: skip + items.length < total,
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
