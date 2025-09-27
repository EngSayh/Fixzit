import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/src/server/middleware/withAuthRbac';
import { getPresignedPutUrl, buildResumeKey } from '@/src/lib/storage/s3';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req).catch(() => null);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = (user as any).role || '';
    const allowed = new Set(['SUPER_ADMIN','ADMIN','HR']);
    if (!allowed.has(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({} as any));
    const { fileName, contentType } = body || {};
    if (!fileName || !contentType) return NextResponse.json({ error: 'Missing fileName or contentType' }, { status: 400 });
    const key = buildResumeKey((user as any).tenantId, String(fileName));
    const url = await getPresignedPutUrl(key, String(contentType), 300);
    return NextResponse.json({ url, key });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to presign' }, { status: 500 });
  }
}

