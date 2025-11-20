import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { getPresignedPutUrl, buildResumeKey } from '@/lib/storage/s3';

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { buildRateLimitKey } from '@/server/security/rateLimitKey';
import { validateBucketPolicies } from '@/lib/security/s3-policy';

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
    if (!process.env.AWS_S3_BUCKET || !process.env.AWS_REGION) {
      return createSecureResponse({ error: 'Storage not configured' }, 500, req);
    }
    const scanEnforced = process.env.S3_SCAN_REQUIRED === 'true';
    if (scanEnforced && !process.env.AV_SCAN_ENDPOINT) {
      return createSecureResponse({ error: 'AV scanning not configured' }, 503, req);
    }
    const policiesOk = await validateBucketPolicies();
    if (!policiesOk) {
      return createSecureResponse({ error: 'Bucket policy/encryption invalid' }, 503, req);
    }
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
    return NextResponse.json({ url, key, headers, scanRequired: scanEnforced });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[Resumes Presign] error', err);
    }
    return createSecureResponse({ error: 'Failed to presign' }, 500, req);
  }
}
