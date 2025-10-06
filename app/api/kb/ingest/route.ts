import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { upsertArticleEmbeddings, deleteArticleEmbeddings } from '@/kb/ingest';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req).catch(() => null);
    if (!user || !['SUPER_ADMIN','ADMIN'].includes((user as any).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({} as any));
    const { articleId, content, lang, roleScopes, route } = body || {};
    if (!articleId || typeof content !== 'string') {
      return NextResponse.json({ error: 'Missing articleId or content' }, { status: 400 });
    }
    await upsertArticleEmbeddings({
      orgId: (user as any).tenantId || null,
      tenantId: (user as any).tenantId || null,
      articleId,
      lang: typeof lang === 'string' ? lang : undefined,
      roleScopes: Array.isArray(roleScopes) ? roleScopes : undefined,
      route: typeof route === 'string' ? route : undefined,
      content
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('kb/ingest error', err);
    return NextResponse.json({ error: 'Ingest failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser(req).catch(() => null);
    if (!user || !['SUPER_ADMIN','ADMIN'].includes((user as any).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const url = new URL(req.url);
    const articleId = url.searchParams.get('articleId');
    if (!articleId) return NextResponse.json({ error: 'Missing articleId' }, { status: 400 });
    await deleteArticleEmbeddings(articleId, (user as any).tenantId || null);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}


