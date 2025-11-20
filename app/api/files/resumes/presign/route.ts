import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { getPresignedPutUrl, buildResumeKey } from '@/lib/storage/s3';

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { buildRateLimitKey } from '@/server/security/rateLimitKey';

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
  try {
    const user = await getSessionUser(req).catch(() => null);
    if (!user) return createSecureResponse({ error: 'Unauthorized' }, 401, req);
    const role = user.role || '';
    const allowed = new Set(['SUPER_ADMIN','ADMIN','HR']);
    if (!allowed.has(role)) return createSecureResponse({ error: 'Forbidden' }, 403, req);
    const rl = rateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    const body = await req.json().catch(() => ({} as unknown));
    const { fileName, contentType } = body || {};
    if (!fileName || !contentType) return createSecureResponse({ error: 'Missing fileName or contentType' }, 400, req);
    const key = buildResumeKey(user.tenantId, String(fileName));
    const { url, headers } = await getPresignedPutUrl(key, String(contentType), 300, {
      category: 'resume',
      user: user.id,
      tenant: user.tenantId || 'global',
    });
    return NextResponse.json({ url, key, headers });
  } catch {
    return createSecureResponse({ error: 'Failed to presign' }, 500, req);
  }
}
