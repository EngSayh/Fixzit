import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import Customer from '@/src/models/Customer';
import Subscription from '@/src/models/Subscription';
import SubscriptionInvoice from '@/src/models/SubscriptionInvoice';
import { computeQuote } from '@/src/lib/pricing';
import { createHppRequest } from '@/src/lib/paytabs';
import { getUserFromToken } from '@/src/lib/auth';
import { rateLimit } from '@/src/server/security/rateLimit';
import { z } from 'zod';

const subscriptionSchema = z.object({
  customer: z.object({
    type: z.enum(['ORG', 'OWNER']),
    name: z.string().min(1),
    billingEmail: z.string().email(),
    country: z.string().optional()
  }),
  planType: z.enum(['CORPORATE_FM', 'OWNER_FM']),
  items: z.array(z.any()),
  seatTotal: z.number().positive(),
  billingCycle: z.enum(['monthly', 'annual']),
  paytabsRegion: z.string().optional(),
  returnUrl: z.string().url(),
  callbackUrl: z.string().url()
});

// Require: {customer:{type:'ORG'|'OWNER',...}, planType:'CORPORATE_FM'|'OWNER_FM', items:[], seatTotal, billingCycle, paytabsRegion, returnUrl, callbackUrl}
export async function POST(req: NextRequest) {
  try {
    // Authentication & Authorization
    const token = req.headers.get('authorization')?.replace('Bearer ', '')?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Role-based access control - only billing admins or org admins can subscribe
    if (!['SUPER_ADMIN', 'ADMIN', 'BILLING_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to manage subscriptions' }, { status: 403 });
    }

    // Rate limiting for subscription operations
    const key = `billing:subscribe:${user.tenantId}`;
    const rl = rateLimit(key, 3, 300_000); // 3 subscriptions per 5 minutes per tenant
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Subscription rate limit exceeded. Please wait before creating another subscription.' }, { status: 429 });
    }

    await db;
    const body = subscriptionSchema.parse(await req.json());

    // 1) Upsert customer - ensure tenant isolation
    const customer = await Customer.findOneAndUpdate(
      { type: body.customer.type, billingEmail: body.customer.billingEmail, orgId: user.tenantId },
      { ...body.customer, orgId: user.tenantId }, 
      { upsert: true, new: true }
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
      orgId: user.tenantId,
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
      nextInvoiceAt: new Date(),
      createdBy: user.id
    });

    // 4) First invoice amount:
    const amount = body.billingCycle === 'annual' ? quote.annualTotal : quote.monthly;

    const inv = await SubscriptionInvoice.create({
      subscriptionId: sub._id,
      orgId: user.tenantId,
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Subscription creation failed:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}
