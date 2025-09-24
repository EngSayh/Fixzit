import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/src/lib/db';
import { KnowledgeArticle } from '@/src/db/models/KnowledgeArticle';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth/options';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'CORP_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const module = searchParams.get('module');
    const status = searchParams.get('status');
    const lang = searchParams.get('lang');

    // Build query
    const query: any = {};
    if (session.user.role !== 'SUPER_ADMIN') {
      query.orgId = session.user.orgId; // Tenant scoping
    }
    if (module && module !== 'all') query.module = module;
    if (status && status !== 'all') query.status = status;
    if (lang && lang !== 'all') query.lang = lang;

    // Fetch articles
    const articles = await KnowledgeArticle.find(query)
      .select('title module lang status tags version updatedAt')
      .sort({ updatedAt: -1 })
      .limit(100);

    return NextResponse.json({ articles });
  } catch (error) {
    console.error('Failed to fetch articles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'CORP_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    
    // Create article
    const article = await KnowledgeArticle.create({
      ...data,
      orgId: session.user.orgId,
      createdBy: session.user.id,
      updatedBy: session.user.id,
      sources: [{ type: 'admin', ref: `user:${session.user.id}` }]
    });

    return NextResponse.json({ article });
  } catch (error) {
    console.error('Failed to create article:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
