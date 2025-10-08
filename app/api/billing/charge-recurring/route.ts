import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import Subscription from '@/server/models/Subscription';
import { createSecureResponse } from '@/server/security/headers';
import SubscriptionInvoice from '@/server/models/SubscriptionInvoice';
import PaymentMethod from '@/server/models/PaymentMethod';

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

// POST with secret header from cron – for each sub due this day: charge recurring via token
/**
 * @openapi
 * /api/billing/charge-recurring:
 *   get:
 *     summary: billing/charge-recurring operations
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
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.ip || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) return createSecureResponse({ error:'UNAUTH' }, 401, req);
  const client = await connectToDatabase();
  const today = new Date();
  const dueSubs = await Subscription.find({ billingCycle:'monthly', status:'active', nextInvoiceAt: { $lte: today }, paytabsTokenId: { $ne: null } });

  for (const s of dueSubs) {
    const pm = await PaymentMethod.findById(s.paytabsTokenId);
    if (!pm) continue;

    const inv = await SubscriptionInvoice.create({
      subscriptionId: s._id, amount: s.totalMonthly, currency: s.currency,
      periodStart: today, periodEnd: new Date(new Date().setMonth(today.getMonth()+1)),
      dueDate: today, status:'pending'
    });

    // recurring charge (server-to-server)
    const resp = await fetch(`${process.env.PAYTABS_RECURRING_BASE || 'https://secure.paytabs.com'}/payment/request`, {
      method:'POST',
      headers: { 'Content-Type':'application/json', 'authorization': process.env.PAYTABS_SERVER_KEY! },
      body: JSON.stringify({
        profile_id: process.env.PAYTABS_PROFILE_ID, tran_type:'sale', tran_class:'recurring',
        cart_id: `INV-${inv._id}`, cart_description: `Fixzit Monthly ${s.planType}`, cart_amount: inv.amount, cart_currency: inv.currency,
        token: pm.token
      })
    }).then(r=>r.json());

    if (resp?.tran_ref) { inv.status='paid'; inv.paytabsTranRef = resp.tran_ref; await inv.save(); }
    else { inv.status='failed'; inv.errorMessage = resp?.message || 'UNKNOWN'; await inv.save(); }
    s.nextInvoiceAt = new Date(new Date().setMonth(today.getMonth()+1)); await s.save();
  }

  return createSecureResponse({ ok: true, count: dueSubs.length });
}



