import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/src/lib/db';
import { KnowledgeArticle } from '@/src/db/models/KnowledgeArticle';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth/options';

/**
 * GET handler that lists knowledge articles with optional filtering and tenant scoping.
 *
 * Retrieves up to 100 KnowledgeArticle documents, selecting title, module, lang, status, tags, version, and updatedAt,
 * sorted by most recently updated. Applies tenant scoping for non-SUPER_ADMIN users and supports optional query filters.
 *
 * @param req - Incoming request. Accepted query parameters:
 *   - `module`: module name to filter by (omit or use `all` to disable).
 *   - `status`: status to filter by (omit or use `all` to disable).
 *   - `lang`: language to filter by (omit or use `all` to disable).
 * @returns A NextResponse with JSON `{ articles }` on success, or `{ error: 'Unauthorized' }` / `{ error: 'Internal server error' }` with appropriate HTTP status codes.
 */
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

/**
 * Create a new knowledge article for the requesting user's tenant.
 *
 * Creates a KnowledgeArticle using the JSON body of the request, automatically setting
 * orgId to the authenticated user's orgId, createdBy and updatedBy to the user's id,
 * and initializing `sources` with an admin reference to that user.
 *
 * Only users with role `SUPER_ADMIN`, `ADMIN`, or `CORP_ADMIN` are allowed; unauthorized
 * requests receive a 401 response. On success returns a JSON response containing the
 * created `article`. On failure returns a 500 response with an error message.
 *
 * @returns A NextResponse with `{ article }` on success, or `{ error }` and an appropriate HTTP status on failure.
 */
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
