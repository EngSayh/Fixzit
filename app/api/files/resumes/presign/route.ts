import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { getPresignedPutUrl, buildResumeKey } from '@/lib/storage/s3';

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

/**
 * @openapi
 * /api/files/resumes/presign:
 *   get:
 *     summary: files/resumes/presign operations
 *     tags: [files]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.ip || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    const user = await getSessionUser(req).catch(() => null);
    if (!user) return createSecureResponse({ error: 'Unauthorized' }, 401, req);
    const role = (user as any).role || '';
    const allowed = new Set(['SUPER_ADMIN','ADMIN','HR']);
    if (!allowed.has(role)) return createSecureResponse({ error: 'Forbidden' }, 403, req);
    const body = await req.json().catch(() => ({} as any));
    const { fileName, contentType } = body || {};
    if (!fileName || !contentType) return createSecureResponse({ error: 'Missing fileName or contentType' }, 400, req);
    const key = buildResumeKey(user.tenantId, String(fileName));
    const url = await getPresignedPutUrl(key, String(contentType), 300);
    return NextResponse.json({ url, key });
  } catch (err) {
    return createSecureResponse({ error: 'Failed to presign' }, 500, req);
  }
}

