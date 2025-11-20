import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { getPresignedPutUrl } from '@/lib/storage/s3';
import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError } from '@/server/utils/errorResponses';
import { buildRateLimitKey } from '@/server/security/rateLimitKey';
import { createSecureResponse } from '@/server/security/headers';

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
]);

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
/**
 * @openapi
 * /api/work-orders/[id]/attachments/presign:
 *   get:
 *     summary: work-orders/[id]/attachments/presign operations
 *     tags: [work-orders]
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
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getSessionUser(req).catch(() => null);
  if (!user) return createSecureResponse({ error: 'Unauthorized' }, 401, req);

  const rl = rateLimit(buildRateLimitKey(req, user.id), 30, 60_000);
  if (!rl.allowed) return rateLimitError();

  const { name, type, size } = await req.json().catch(() => ({} as Record<string, unknown>));
  if (!name || !type || typeof size !== 'number') {
    return createSecureResponse({ error: 'Missing name/type/size' }, 400, req);
  }
  if (!ALLOWED_TYPES.has(type as string)) {
    return createSecureResponse({ error: 'Unsupported type' }, 400, req);
  }
  if (size > MAX_SIZE_BYTES) {
    return createSecureResponse({ error: 'File too large' }, 400, req);
  }

  const safeName = encodeURIComponent(String(name).replace(/[^a-zA-Z0-9._-]/g, '_'));
  const key = `wo/${params.id}/${Date.now()}-${safeName}`;
  const { url: putUrl, headers } = await getPresignedPutUrl(key, String(type), 900, {
    category: 'work-order-attachment',
    user: user.id,
    tenant: user.tenantId || 'global',
    workOrderId: params.id,
  });
  const expiresAt = new Date(Date.now() + 900_000).toISOString();

  return NextResponse.json({ putUrl, key, expiresAt, headers });
}
