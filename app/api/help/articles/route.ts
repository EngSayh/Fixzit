import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

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
    const url = new URL(req.url);
    const sp = url.searchParams;
    const category = sp.get("category") || undefined;
    const q = sp.get("q") || undefined;
    // Public endpoint must only return published content
    const status: 'PUBLISHED' = 'PUBLISHED';
    const rawPage = Number(sp.get("page"));
    const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const rawLimit = Number(sp.get("limit"));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(50, Math.floor(rawLimit)) : 20;
    const skip = (page - 1) * limit;

    const db = await getDatabase();
    const coll = db.collection(COLLECTION);

    // Indexes are created by scripts/add-database-indexes.js

    const filter: any = { };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (q) filter.$text = { $search: q };

    const cursor = coll.find(filter as any, {
      projection: q ? { score: { $meta: "textScore" }, slug: 1, title: 1, category: 1, updatedAt: 1 } : { slug: 1, title: 1, category: 1, updatedAt: 1 }
    });

    if (q) {
      cursor.sort({ score: { $meta: "textScore" } });
    } else {
      cursor.sort({ updatedAt: -1 });
    }

    const total = await coll.countDocuments(filter);
    const items = await cursor.skip(skip).limit(limit).toArray();

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
