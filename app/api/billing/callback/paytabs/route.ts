import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import SubscriptionInvoice from '@/server/models/SubscriptionInvoice';
import Subscription from '@/server/models/Subscription';
import PaymentMethod from '@/server/models/PaymentMethod';
import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

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
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const client = await connectToDatabase();
  const payload = await req.json().catch(()=>null);
  const data = payload || {}; // if using return-url (form-data), create a separate handler
  const tranRef = data.tran_ref || data.tranRef;
  const cartId  = data.cart_id || data.cartId;
  const token   = data.token;

  const subId = cartId?.replace('SUB-','');
  const sub = await Subscription.findById(subId);
  if (!sub) return createSecureResponse({ error: 'SUB_NOT_FOUND' }, 400, req);

  // Find invoice
  const inv = await SubscriptionInvoice.findOne({ subscriptionId: sub._id, status: 'pending' });
  if (!inv) return createSecureResponse({ error: 'INV_NOT_FOUND' }, 400, req);

  const statusOk = (data.payment_result?.response_status || data.respStatus) === 'A';
  if (!statusOk) {
    inv.status = 'failed'; inv.errorMessage = data.payment_result?.response_message || data.respMessage;
    await inv.save(); return createSecureResponse({ ok: false }, 200, req);
  }

  inv.status = 'paid'; inv.paytabsTranRef = tranRef; await inv.save();

  if (token && sub.billingCycle === 'monthly') {
    const pm = await PaymentMethod.create({
      customerId: sub.customerId, token, scheme: data.payment_info?.card_scheme, last4: (data.payment_info?.payment_description||'').slice(-4),
      expMonth: data.payment_info?.expiryMonth, expYear: data.payment_info?.expiryYear
    });
    sub.paytabsTokenId = pm._id;
    await sub.save();
  }

  return createSecureResponse({ ok: true });
}



