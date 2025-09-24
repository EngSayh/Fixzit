import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/lib/mongo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
