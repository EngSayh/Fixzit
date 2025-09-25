import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Collection name aligned with Mongoose default pluralization for model "HelpArticle"
const COLLECTION = 'helparticles';

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
 * The handler ensures required MongoDB indexes (unique `slug`, `status+updatedAt`, and a text index on `title`, `content`, and `tags`), builds a filter from the query params, and returns a JSON response with the matching items sorted by text score when `q` is provided or by `updatedAt` otherwise.
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
export async function GET(req: NextRequest){
  try {
    const user = await getSessionUser(req).catch(() => null);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const url = new URL(req.url);
    const sp = url.searchParams;
    const category = sp.get("category") || undefined;
    const q = sp.get("q") || undefined;
    // Public endpoint must only return published content
    const status: 'PUBLISHED' = 'PUBLISHED';
    const rawPage = Number(sp.get("page"));
    const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const limitParam = sp.get("limit");
    const rawLimit = limitParam === null ? NaN : Number(limitParam);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(50, Math.floor(rawLimit))) : 20;
    const skip = (page - 1) * limit;

    const db = await getDatabase();
    const coll = db.collection(COLLECTION);

    // Indexes are created by scripts/add-database-indexes.js

    // Enforce tenant isolation; allow global articles with no tenantId
    const tenantScope = { $or: [ { tenantId: user.tenantId }, { tenantId: { $exists: false } }, { tenantId: null } ] } as any;
    const filter: any = { ...tenantScope };
    if (status) filter.status = status;
    if (category) filter.category = category;
    
    function escapeRegExp(input: string) {
      return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    let items: any[] = [];
    let total = 0;

    if (q) {
      // Try $text search first; fallback to regex if text index is missing
      const textFilter = { ...filter, $text: { $search: q } } as any;
      const textProjection = { score: { $meta: "textScore" }, slug: 1, title: 1, category: 1, updatedAt: 1 } as any;
      try {
        total = await coll.countDocuments(textFilter);
        items = await coll
          .find(textFilter, { projection: textProjection })
          .sort({ score: { $meta: "textScore" } })
          .skip(skip)
          .limit(limit)
          .toArray();
      } catch (err: any) {
        // Fallback when text index is missing
        const safe = new RegExp(escapeRegExp(q), 'i');
        const regexFilter = { ...filter, $or: [ { title: safe }, { content: safe }, { tags: safe } ] } as any;
        total = await coll.countDocuments(regexFilter);
        items = await coll
          .find(regexFilter, { projection: { slug: 1, title: 1, category: 1, updatedAt: 1 } })
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();
      }
    } else {
      total = await coll.countDocuments(filter);
      items = await coll
        .find(filter as any, { projection: { slug: 1, title: 1, category: 1, updatedAt: 1 } })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
    }

    return NextResponse.json({
      items,
      page,
      limit,
      total,
      hasMore: skip + items.length < total
    });
  } catch (error) {
    console.error('Error fetching help articles:', error);
    return NextResponse.json({ error: 'Failed to fetch help articles' }, { status: 500 });
  }
}
