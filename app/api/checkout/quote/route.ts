import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/db/mongoose';
import { quotePrice } from '@/services/pricing';

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

/**
 * @openapi
 * /api/checkout/quote:
 *   get:
 *     summary: checkout/quote operations
 *     tags: [checkout]
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

  await dbConnect();

  const body = await req.json();
  const { seats, modules, billingCycle, currency } = body;

  const seatCount = Number(seats);
  if (!Number.isFinite(seatCount) || seatCount <= 0) {
    return createSecureResponse({ error: 'INVALID_SEAT_COUNT' }, 400, req);
  }

  if (!Array.isArray(modules) || modules.length === 0) {
    return createSecureResponse({ error: 'MODULES_REQUIRED' }, 400, req);
  }

  const quote = await quotePrice({
    priceBookCurrency: currency ?? 'USD',
    seats: seatCount,
    modules,
    billingCycle: billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY',
  });

  return createSecureResponse(quote, 200, req);
}

