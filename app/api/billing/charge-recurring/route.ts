import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/src/lib/mongodb-unified';
import Subscription from '@/src/models/Subscription';
import { createSecureResponse } from '@/src/server/security/headers';
import SubscriptionInvoice from '@/src/models/SubscriptionInvoice';
import PaymentMethod from '@/src/models/PaymentMethod';

// POST with secret header from cron – for each sub due this day: charge recurring via token
export async function POST(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) return NextResponse.json({ error:'UNAUTH' }, { status: 401 });
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

