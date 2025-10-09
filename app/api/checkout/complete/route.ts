import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/db/mongoose';
import Subscription from '@/server/models/Subscription';
import { finalizePayTabsTransaction, normalizePayTabsPayload } from '@/services/paytabs';

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

/**
 * @openapi
 * /api/checkout/complete:
 *   get:
 *     summary: checkout/complete operations
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
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  await dbConnect();
  const body = await req.json();

  if (body.payload) {
    const normalized = normalizePayTabsPayload(body.payload);
    const result = await finalizePayTabsTransaction(normalized);
    return createSecureResponse(result, 200, req);
  }

  const subscriptionId = body.subscriptionId;
  const cartId = body.cartId;

  const subscription = subscriptionId
    ? await Subscription.findById(subscriptionId)
    : await Subscription.findOne({ 'paytabs.cart_id': cartId });

  if (!subscription) {
    return createSecureResponse({ error: 'SUBSCRIPTION_NOT_FOUND' }, 404, req);
  }

  return NextResponse.json({
    ok: subscription.status === 'ACTIVE',
    subscription,
  });
}


