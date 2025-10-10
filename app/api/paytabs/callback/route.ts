import { NextRequest} from 'next/server';
import { dbConnect } from '@/db/mongoose';
import { finalizePayTabsTransaction, normalizePayTabsPayload } from '@/services/paytabs';

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

/**
 * @openapi
 * /api/paytabs/callback:
 *   get:
 *     summary: paytabs/callback operations
 *     tags: [paytabs]
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
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  await dbConnect();
  const payload = await req.json();
  const normalized = normalizePayTabsPayload(payload);

  try {
    const result = await finalizePayTabsTransaction(normalized);
    return createSecureResponse(result, 200, req);
  } catch (error: unknown) {
    return createSecureResponse({ error: (error as Error).message }, 400, req);
  }
}

