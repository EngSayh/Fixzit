import { NextRequest} from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import SubscriptionInvoice from '@/server/models/SubscriptionInvoice';
import Subscription from '@/server/models/Subscription';
import PaymentMethod from '@/server/models/PaymentMethod';
import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';
import { verifyPayment, validateCallback } from '@/lib/paytabs';

/**
 * @openapi
 * /api/billing/callback/paytabs:
 *   get:
 *     summary: billing/callback/paytabs operations
 *     tags: [billing]
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
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  await connectToDatabase();
  
  // Read raw body for signature validation
  const rawBody = await req.text();
  const signature = req.headers.get('signature') || '';
  
  let payload: Record<string, unknown> | null = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return createSecureResponse({ error: 'Invalid JSON payload' }, 400, req);
  }
  
  // 1) Validate signature
  if (!validateCallback(payload, signature)) {
    console.error('[Billing Callback] Invalid signature from PayTabs');
    return createSecureResponse({ error: 'Invalid signature' }, 401, req);
  }
  
  const data = payload || {};
  const tranRef = (data.tran_ref || data.tranRef) as string;
  const cartId  = (data.cart_id || data.cartId) as string;
  const token   = data.token as string | undefined;

  // 2) Verify payment with PayTabs server-to-server
  let verification: { payment_result?: { response_status?: string; response_message?: string }; cart_amount?: string; payment_info?: unknown } | null = null;
  try {
    verification = await verifyPayment(tranRef) as typeof verification;
  } catch (error) {
    console.error('[Billing Callback] Failed to verify payment with PayTabs:', error instanceof Error ? error.message : String(error));
    return createSecureResponse({ error: 'Payment verification failed' }, 500, req);
  }
  
  const verifiedOk = verification?.payment_result?.response_status === 'A';
  
  const subId = cartId?.replace('SUB-','');
  const sub = await Subscription.findById(subId);
  if (!sub) return createSecureResponse({ error: 'SUB_NOT_FOUND' }, 400, req);

  // Find invoice
  const inv = await SubscriptionInvoice.findOne({ subscriptionId: sub._id, status: 'pending' });
  if (!inv) return createSecureResponse({ error: 'INV_NOT_FOUND' }, 400, req);

  if (!verifiedOk) {
    inv.status = 'failed'; 
    inv.errorMessage = verification?.payment_result?.response_message || data.respMessage as string || 'Payment declined';
    await inv.save(); 
    return createSecureResponse({ ok: false }, 200, req);
  }

  inv.status = 'paid'; inv.paytabsTranRef = tranRef; await inv.save();

  if (token && sub.billingCycle === 'monthly') {
    const paymentInfo = (verification?.payment_info || data.payment_info) as { card_scheme?: string; payment_description?: string; expiryMonth?: string; expiryYear?: string } | undefined;
    const pm = await PaymentMethod.create({
      customerId: sub.customerId, 
      token, 
      scheme: paymentInfo?.card_scheme, 
      last4: (paymentInfo?.payment_description||'').slice(-4),
      expMonth: paymentInfo?.expiryMonth, 
      expYear: paymentInfo?.expiryYear
    });
    sub.paytabsTokenId = pm._id;
    await sub.save();
  }

  return createSecureResponse({ ok: true }, 200, req);
}



