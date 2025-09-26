import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getSessionUser } from '@/src/server/middleware/withAuthRbac';
import { getPresignedGetUrl, buildResumeKey } from '@/src/lib/storage/s3';

// Resume files are stored under a non-public project directory with UUID-based names
const BASE_DIR = path.join(process.cwd(), 'private-uploads', 'resumes');

export async function GET(req: NextRequest, { params }: { params: { file: string } }) {
  try {
    const user = await getSessionUser(req).catch(() => null);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const allowed = new Set(['SUPER_ADMIN','ADMIN','HR']);
    if (!allowed.has((user as any).role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(req.url);
    const token = url.searchParams.get('token') || '';
    const expParam = url.searchParams.get('exp') || '';
    const exp = Number(expParam);
    if (!token || !Number.isFinite(exp)) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    if (Date.now() > exp) return NextResponse.json({ error: 'Token expired' }, { status: 403 });
    const expected = generateToken(params.file, exp);
    if (!timingSafeEqual(expected, token)) return NextResponse.json({ error: 'Invalid token' }, { status: 403 });

    // Prefer S3 if configured; else local fallback
    if (process.env.AWS_S3_BUCKET) {
      const key = buildResumeKey((user as any).tenantId, params.file);
      const urlSigned = await getPresignedGetUrl(key, 300);
      return NextResponse.redirect(urlSigned, { status: 302 });
    }
    const safeName = path.basename(params.file);
    const filePath = path.join(BASE_DIR, safeName);
    const data = await fs.readFile(filePath).catch(() => null);
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const contentType = contentTypeFromName(safeName);
    const out = new Uint8Array(data.length);
    out.set(data);
    return new NextResponse(out, { status: 200, headers: { 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="${safeName}"` } });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { file: string } }) {
  try {
    const user = await getSessionUser(req).catch(() => null);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const allowed = new Set(['SUPER_ADMIN','ADMIN','HR']);
    if (!allowed.has((user as any).role || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const expires = Date.now() + 1000 * 60 * 10; // 10 minutes
    const token = generateToken(params.file, expires);
    return NextResponse.json({ url: `${new URL(req.url).origin}/api/files/resumes/${encodeURIComponent(params.file)}?token=${encodeURIComponent(token)}&exp=${expires}` });
  } catch {
    return NextResponse.json({ error: 'Failed to sign URL' }, { status: 500 });
  }
}

function generateToken(name: string, exp?: number) {
  const secret = process.env.FILE_SIGNING_SECRET || 'dev-secret-change-me';
  const payload = `${name}:${exp || ''}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function timingSafeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function contentTypeFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.txt')) return 'text/plain';
  return 'application/octet-stream';
}

