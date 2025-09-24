import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/lib/mongo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Handles GET requests to fetch published knowledge articles for an organization.
 *
 * Accepts the following URL query parameters:
 * - orgId (required): organization identifier — returns 400 if missing.
 * - lang: language code (default: "en").
 * - role: role used to filter `roleScopes` (default: "GUEST").
 * - search: optional text to match against `title` (case-insensitive regex) or `tags` (lowercased exact match).
 * - recent: "true" to return most recently updated articles (limits to 10); any other value returns a sorted list (limits to 50).
 *
 * Returns a JSON NextResponse with { articles } where each article object includes: title, module, slug, tags, and updatedAt.
 * On unexpected errors responds with a 500 status and an error message.
 *
 * @returns A NextResponse containing the articles array on success, or a JSON error response with appropriate HTTP status.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const lang = searchParams.get('lang') || 'en';
    const role = searchParams.get('role') || 'GUEST';
    const search = searchParams.get('search');
    const recent = searchParams.get('recent') === 'true';

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    const db = await getDb();
    const collection = (db as any).connection?.db?.collection('knowledge_articles') || (db as any).db?.collection('knowledge_articles');

    // Build query
    const query: any = {
      orgId,
      lang,
      status: 'PUBLISHED',
      roleScopes: { $in: [role] }
    };

    // Add search if provided
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { tags: { $in: [search.toLowerCase()] } }
      ];
    }

    // Sort options
    const sort: any = recent 
      ? { updatedAt: -1 } 
      : { module: 1, title: 1 };

    // Fetch articles
    const articles = await collection
      .find(query)
      .project({ title: 1, module: 1, slug: 1, tags: 1, updatedAt: 1 })
      .sort(sort)
      .limit(recent ? 10 : 50)
      .toArray();

    return NextResponse.json({ articles });
  } catch (error) {
    console.error('Failed to fetch guides:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
