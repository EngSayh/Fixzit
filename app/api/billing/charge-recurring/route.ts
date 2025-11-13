import { NextRequest} from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import Subscription from '@/server/models/Subscription';
import SubscriptionInvoice from '@/server/models/SubscriptionInvoice';
import PaymentMethod from '@/server/models/PaymentMethod';
import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';
import { logger } from '@/lib/logger';

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
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) return createSecureResponse({ error:'UNAUTH' }, 401, req);
  await connectToDatabase();
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

    // recurring charge (server-to-server) with error handling
    try {
      const response = await fetch(`${process.env.PAYTABS_RECURRING_BASE || 'https://secure.paytabs.com'}/payment/request`, {
        method:'POST',
        headers: { 'Content-Type':'application/json', 'authorization': process.env.PAYTABS_SERVER_KEY! },
        body: JSON.stringify({
          profile_id: process.env.PAYTABS_PROFILE_ID, tran_type:'sale', tran_class:'recurring',
          cart_id: `INV-${inv._id}`, cart_description: `Fixzit Monthly ${s.planType}`, cart_amount: inv.amount, cart_currency: inv.currency,
          token: pm.token
        })
      });

      if (!response.ok) {
        throw new Error(`PayTabs HTTP ${response.status}: ${await response.text().catch(() => 'Unknown error')}`);
      }

      const resp = await response.json();

      if (resp?.tran_ref) { 
        inv.status='paid'; 
        inv.paytabsTranRef = resp.tran_ref; 
        await inv.save(); 
      } else { 
        inv.status='failed'; 
        inv.errorMessage = resp?.message || 'UNKNOWN'; 
        await inv.save(); 
      }
    } catch (error) {
      logger.error(`Recurring charge failed for subscription ${s._id}`, { error });
      inv.status='failed';
      inv.errorMessage = error instanceof Error ? error.message : 'Payment gateway error';
      await inv.save();
    }
    s.nextInvoiceAt = new Date(new Date().setMonth(today.getMonth()+1)); await s.save();
  }

  return createSecureResponse({ ok: true, count: dueSubs.length });
}



