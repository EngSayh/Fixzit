import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError } from '@/server/utils/errorResponses';
import { buildRateLimitKey } from '@/server/security/rateLimitKey';
import { createSecureResponse } from '@/server/security/headers';
import { getPresignedPutUrl } from '@/lib/storage/s3';
import { Config } from '@/lib/config/constants';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

const ALLOWED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg']);

const MAX_SIZE_BYTES: Record<string, number> = {
  'application/pdf': 25 * 1024 * 1024, // 25MB
  'image/png': 10 * 1024 * 1024,       // 10MB
  'image/jpeg': 10 * 1024 * 1024,
  'image/jpg': 10 * 1024 * 1024,
};

type PresignCategory = 'kyc' | 'resume' | 'invoice' | 'document';

function sanitizeFileName(name: string): string {
  // Remove path separators and limit to safe characters
  const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return sanitized.slice(-128); // cap length to avoid overly long keys
}

function buildKey(
  tenantId: string | null | undefined,
  userId: string,
  category: PresignCategory,
  fileName: string
) {
  const safeTenant = (tenantId || 'global').replace(/[^a-zA-Z0-9_-]/g, '-');
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, '-');
  const safeFile = sanitizeFileName(fileName);
  const prefix = category || 'document';
  return `${safeTenant}/${prefix}/${safeUser}/${Date.now()}-${safeFile}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req).catch(() => null);
    if (!user) return createSecureResponse({ error: 'Unauthorized' }, 401, req);

    if (!Config.aws.s3.bucket || !Config.aws.region) {
      return createSecureResponse({ error: 'Storage not configured' }, 500, req);
    }
    const scanEnforced = Config.aws.scan.required;
    if (scanEnforced && !Config.aws.scan.endpoint) {
      return createSecureResponse({ error: 'AV scanning not configured' }, 503, req);
    }

    const { tenantId, id: userId } = user;

    // Rate limit to avoid abuse
    const rl = rateLimit(buildRateLimitKey(req, userId), 30, 60_000);
    if (!rl.allowed) return rateLimitError();

    const body = await req.json().catch(() => ({}));
    const { fileName, fileType, fileSize, category } = body || {};

    if (!fileName || !fileType || typeof fileSize !== 'number') {
      return createSecureResponse({ error: 'Missing fileName, fileType, or fileSize' }, 400, req);
    }

    if (!ALLOWED_TYPES.has(fileType)) {
      return createSecureResponse({ error: 'Unsupported file type' }, 400, req);
    }

    const ext = fileName.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      return createSecureResponse({ error: 'Unsupported file extension' }, 400, req);
    }

    const maxSize = MAX_SIZE_BYTES[fileType] ?? 10 * 1024 * 1024;
    if (fileSize > maxSize) {
      return createSecureResponse({ error: `File too large. Max ${Math.round(maxSize / (1024 * 1024))}MB` }, 400, req);
    }

    const cat = (category && typeof category === 'string'
      ? category
      : (fileType.startsWith('image/') ? 'document' : 'document')) as PresignCategory;

    const key = buildKey(tenantId, userId, cat, fileName);
    const { url: uploadUrl, headers: uploadHeaders } = await getPresignedPutUrl(
      key,
      fileType,
      900,
      {
        category: cat,
        user: userId,
        tenant: tenantId || 'global',
      }
    ); // 15 minutes
    const expiresAt = new Date(Date.now() + 900_000).toISOString();

    // Surface metadata for downstream AV scan
    return NextResponse.json({
      uploadUrl,
      uploadHeaders,
      key,
      expiresAt,
      scanRequired: scanEnforced,
      maxSizeBytes: maxSize,
      allowedTypes: Array.from(ALLOWED_TYPES),
    });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[Presign] Failed to create presigned URL:', err);
    }
    return createSecureResponse({ error: 'Failed to presign' }, 500, req);
  }
}
