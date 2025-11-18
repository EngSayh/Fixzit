import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb-unified';
import Customer from '@/server/models/Customer';
import Subscription from '@/server/models/Subscription';
import SubscriptionInvoice from '@/server/models/SubscriptionInvoice';
import { computeQuote } from '@/lib/pricing';
import { createHppRequest } from '@/lib/paytabs';
import { getUserFromToken } from '@/lib/auth';
import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError, zodValidationError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { z } from 'zod';
import { getClientIP } from '@/server/security/headers';
import { canManageSubscriptions } from '@/lib/auth/role-guards';

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
/**
 * @openapi
 * /api/billing/subscribe:
 *   post:
 *     summary: billing/subscribe operations
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
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 10, 300000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    // Authentication & Authorization
    const token = req.headers.get('authorization')?.replace('Bearer ', '')?.trim();
    if (!token) {
      return createSecureResponse({ error: 'Authentication required' }, 401, req);
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return createSecureResponse({ error: 'Invalid token' }, 401, req);
    }

    // Role-based access control - only billing admins or org admins can subscribe
    if (!canManageSubscriptions(user.role)) {
      return createSecureResponse({ error: 'Insufficient permissions to manage subscriptions' }, 403, req);
    }

    // Rate limiting for subscription operations
    const key = `billing:subscribe:${user.orgId}`;
    const rl = rateLimit(key, 3, 300_000); // 3 subscriptions per 5 minutes per tenant
    if (!rl.allowed) {
      return createSecureResponse({ error: 'Subscription rate limit exceeded. Please wait before creating another subscription.' }, 429, req);
    }

    await connectToDatabase();
    const body = subscriptionSchema.parse(await req.json());

    // 1) Upsert customer - ensure tenant isolation
    const customer = (await Customer.findOneAndUpdate(
      { type: body.customer.type, billingEmail: body.customer.billingEmail, orgId: user.orgId },
      { ...body.customer, orgId: user.orgId }, 
      { upsert: true, new: true }
    ));

    // 2) Quote
    const quote = await computeQuote({
      items: body.items, seatTotal: body.seatTotal, billingCycle: body.billingCycle
    });
    if (quote.contactSales) {
      return createSecureResponse({ error: 'SEAT_LIMIT_EXCEEDED', contact: 'sales@fixzit.app' }, 400, req);
    }

    // 3) Create Subscription snapshot (status pending until paid)
    const sub = (await Subscription.create({
      customerId: customer._id,
      orgId: user.orgId,
      planType: body.planType,
      items: (quote.items || []).map((i: Record<string, unknown>) =>({ moduleId: undefined, // resolved later in worker if needed
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
    }));

    // 4) First invoice amount:
    const amount = body.billingCycle === 'annual' ? quote.annualTotal : quote.monthly;

    // @ts-expect-error - Mongoose 8.x type resolution issue with create overloads
    const inv = await SubscriptionInvoice.create({
      subscriptionId: sub._id,
      orgId: user.orgId,
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
        name: customer.name, 
        email: body.customer.billingEmail, // Use email from request body, not DB model
        country: customer.address?.country || 'SA'
      }
    } as Record<string, unknown>;

    if (body.billingCycle === 'monthly') basePayload.tokenise = 2; // Hex32 token, delivered in callback
    const resp = await createHppRequest(body.paytabsRegion || 'GLOBAL', basePayload);
    // resp.redirect_url to be used on FE
    return NextResponse.json({ subscriptionId: sub._id, invoiceId: inv._id, paytabs: resp });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, req);
    }
    logger.error('Subscription creation failed:', error instanceof Error ? error.message : 'Unknown error');
    return createSecureResponse({ error: 'Failed to create subscription' }, 500, req);
  }
}


