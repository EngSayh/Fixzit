import { NextRequest } from 'next/server';
import { dbConnect } from '@/db/mongoose';
import Subscription from '@/server/models/Subscription';
import { finalizePayTabsTransaction, normalizePayTabsPayload } from '@/lib/finance/paytabs';

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

/**
 * @openapi
 * /api/checkout/complete:
 *   post:
 *     summary: Complete checkout and finalize payment
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
  /**
   * Rate Limiting: 60 requests per minute per IP
   * Protects against checkout spam and payment fraud attempts
   */
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  await dbConnect();
  const body = await req.json();

  /**
   * PayTabs Payment Gateway Callback Flow
   * When PayTabs sends a callback with payment confirmation,
   * we normalize and finalize the transaction
   */
  if (body.payload) {
    const normalized = normalizePayTabsPayload(body.payload);
    const result = await finalizePayTabsTransaction(normalized);
    return createSecureResponse(result, 200, req);
  }

  /**
   * Subscription Retrieval
   * Try to find subscription by either:
   * 1. Direct subscription ID (preferred)
   * 2. PayTabs cart ID (fallback for payment callbacks)
   */
  const subscriptionId = body.subscriptionId;
  const cartId = body.cartId;

  const subscription = subscriptionId
    ? await Subscription.findById(subscriptionId)
    : (await Subscription.findOne({ 'paytabs.cart_id': cartId }));

  if (!subscription) {
    return createSecureResponse({ error: 'SUBSCRIPTION_NOT_FOUND' }, 404, req);
  }

  /**
   * Return subscription status
   * Frontend uses this to determine if checkout was successful
   */
  return createSecureResponse({
    ok: subscription.status === 'ACTIVE',
    subscription
  }, 200, req);
}


