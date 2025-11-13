import { NextRequest} from 'next/server';
import { dbConnect } from '@/db/mongoose';
import PriceBook from '@/server/models/PriceBook';
import { requireSuperAdmin } from '@/lib/authz';

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

/**
 * @openapi
 * /api/admin/billing/pricebooks:
 *   post:
 *     summary: admin/billing/pricebooks operations
 *     tags: [admin]
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
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 100, 60000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await dbConnect();
    await requireSuperAdmin(req);
    const body = await req.json();

    const doc = await PriceBook.create(body);
    return createSecureResponse(doc, 200, req);
  } catch (error) {
    return createSecureResponse(
      {
        error: 'Failed to create pricebook',
        code: 'PRICEBOOK_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        correlationId: crypto.randomUUID()
      },
      500,
      req
    );
  }
}


