import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import Customer from '@/src/models/Customer';
import Subscription from '@/src/models/Subscription';
import SubscriptionInvoice from '@/src/models/SubscriptionInvoice';
import { computeQuote } from '@/src/lib/pricing';
import { createHppRequest } from '@/src/lib/paytabs';

// Require: {customer:{type:'ORG'|'OWNER',...}, planType:'CORPORATE_FM'|'OWNER_FM', items:[], seatTotal, billingCycle, paytabsRegion, returnUrl, callbackUrl}
export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();

  // 1) Upsert customer
  const customer = await Customer.findOneAndUpdate(
    { type: body.customer.type, billingEmail: body.customer.billingEmail },
    body.customer, { upsert: true, new: true }
  );

  // 2) Quote
  const quote = await computeQuote({
    items: body.items, seatTotal: body.seatTotal, billingCycle: body.billingCycle
  });
  if ((quote as any).contactSales) {
    return NextResponse.json({ error: 'SEAT_LIMIT_EXCEEDED', contact: 'sales@fixzit.app' }, { status: 400 });
  }

  // 3) Create Subscription snapshot (status pending until paid)
  const sub = await Subscription.create({
    customerId: customer._id,
    planType: body.planType,
    items: (quote.items || []).map((i:any)=>({ moduleId: undefined, // resolved later in worker if needed
      moduleCode: i.module, // keep code snapshot
      seatCount: i.seatCount, unitPriceMonthly: i.unitPriceMonthly, billingCategory: i.billingCategory })),
    totalMonthly: quote.monthly,
    billingCycle: body.billingCycle,
    annualDiscountPct: quote.annualDiscountPct,
    status: 'active',
    seatTotal: body.seatTotal,
    currency: quote.currency,
    paytabsRegion: body.paytabsRegion || 'GLOBAL',
    startedAt: new Date(),
    nextInvoiceAt: new Date()
  });

  // 4) First invoice amount:
  const amount = body.billingCycle === 'annual' ? quote.annualTotal : quote.monthly;

  const inv = await SubscriptionInvoice.create({
    subscriptionId: sub._id,
    amount, currency: quote.currency,
    periodStart: new Date(),
    periodEnd: new Date(new Date().setMonth(new Date().getMonth() + (body.billingCycle==='annual'?12:1))),
    dueDate: new Date(), status: 'pending'
  });

  // 5) Create PayTabs HPP. For monthly: include tokenise=2 to capture token. For annual: no token needed.
  const basePayload = {
    profile_id: process.env.PAYTABS_PROFILE_ID,
    tran_type: 'sale',
    tran_class: body.billingCycle === 'monthly' ? 'ecom' : 'ecom',
    cart_id: `SUB-${sub._id}`,
    cart_description: `Fixzit ${body.planType} (${body.billingCycle})`,
    cart_amount: amount,
    cart_currency: quote.currency,
    return: body.returnUrl, callback: body.callbackUrl,
    customer_details: {
      name: customer.name, email: customer.billingEmail, country: customer.country || 'SA'
    }
  } as any;

  if (body.billingCycle === 'monthly') basePayload.tokenise = 2; // Hex32 token, delivered in callback
  const resp = await createHppRequest(body.paytabsRegion || 'GLOBAL', basePayload);
  // resp.redirect_url to be used on FE
  return NextResponse.json({ subscriptionId: sub._id, invoiceId: inv._id, paytabs: resp });
}
