/**
 * @description Creates new subscription checkout sessions for FM module packages using Tap Payments.
 * Supports both CORPORATE_FM (organization) and OWNER_FM (individual) plan types.
 * Calculates pricing, creates checkout session, and provisions subscription.
 * @route POST /api/billing/subscribe
 * @access Private - Authenticated users with subscription management permissions
 * @param {Object} body.customer - Customer details (type, name, billingEmail, country)
 * @param {Object} body.planType - Plan type: 'CORPORATE_FM' or 'OWNER_FM'
 * @param {Object} body.items - Array of module items with pricing and seat counts
 * @param {Object} body.billingCycle - Optional billing cycle: 'monthly' or 'annual'
 * @returns {Object} checkoutUrl: Tap payment URL, subscriptionId: created subscription ID
 * @throws {401} If user is not authenticated
 * @throws {403} If user lacks subscription management permissions
 * @throws {400} If validation fails or plan type is invalid
 * @throws {429} If rate limit exceeded
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { EMAIL_DOMAINS } from "@/lib/config/domains";
import { connectToDatabase } from "@/lib/mongodb-unified";
import Customer from "@/server/models/Customer";
import { computeQuote } from "@/lib/pricing";
import { createSubscriptionCheckout } from "@/lib/finance/checkout";
import { getUserFromToken } from "@/lib/auth";
import { smartRateLimit } from "@/server/security/rateLimit";
import {
  rateLimitError,
  zodValidationError,
} from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { z } from "zod";
import { getClientIP } from "@/server/security/headers";
import { canManageSubscriptions } from "@/lib/auth/role-guards";

const subscriptionSchema = z.object({
  customer: z.object({
    type: z.enum(["ORG", "OWNER"]),
    name: z.string().min(1),
    billingEmail: z.string().email(),
    country: z.string().optional(),
  }),
  planType: z.enum(["CORPORATE_FM", "OWNER_FM"]),
  items: z.array(z.object({
    moduleCode: z.string().optional(),
    module: z.string().optional(),
    unitPriceMonthly: z.number().nonnegative().optional(),
    seatCount: z.number().int().nonnegative().optional(),
    billingCategory: z.string().optional(),
  }).refine(
    (item) => item.moduleCode || item.module || item.billingCategory,
    { message: "Each item must have at least one identifier: 'moduleCode', 'module', or 'billingCategory'" }
  )),
  seatTotal: z.number().positive(),
  billingCycle: z.enum(["monthly", "annual"]),
  returnUrl: z.string().url(),
  callbackUrl: z.string().url(),
  priceBookId: z.string().optional(),
});

// Require: {customer:{type:'ORG'|'OWNER',...}, planType:'CORPORATE_FM'|'OWNER_FM', items:[], seatTotal, billingCycle, returnUrl, callbackUrl}
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
  // Rate limiting - SECURITY: In-memory limiter
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 10, 300000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    // Authentication & Authorization
    const token = req.headers
      .get("authorization")
      ?.replace("Bearer ", "")
      ?.trim();
    if (!token) {
      return createSecureResponse(
        { error: "Authentication required" },
        401,
        req,
      );
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return createSecureResponse({ error: "Invalid token" }, 401, req);
    }

    // Role-based access control - only billing admins or org admins can subscribe
    if (!canManageSubscriptions(user.role)) {
      return createSecureResponse(
        { error: "Insufficient permissions to manage subscriptions" },
        403,
        req,
      );
    }

    // Rate limiting for subscription operations (per tenant) - SECURITY: Distributed
    const key = `billing:subscribe:${user.orgId}`;
    const tenantRl = await smartRateLimit(key, 3, 300_000); // 3 subscriptions per 5 minutes per tenant
    if (!tenantRl.allowed) {
      return createSecureResponse(
        {
          error:
            "Subscription rate limit exceeded. Please wait before creating another subscription.",
        },
        429,
        req,
      );
    }

    await connectToDatabase();
    const body = subscriptionSchema.parse(await req.json());

    // 1) Upsert customer - ensure tenant isolation
    const customer = await Customer.findOneAndUpdate(
      {
        type: body.customer.type,
        billingEmail: body.customer.billingEmail,
        orgId: user.orgId,
      },
      { ...body.customer, orgId: user.orgId },
      { upsert: true, new: true },
    );

    // 2) Quote
    const quote = await computeQuote({
      items: body.items,
      seatTotal: body.seatTotal,
      billingCycle: body.billingCycle,
    });
    if (quote.contactSales) {
      return createSecureResponse(
        { error: "SEAT_LIMIT_EXCEEDED", contact: EMAIL_DOMAINS.sales },
        400,
        req,
      );
    }

    const modules = (body.items || []).map(
      (i: Record<string, unknown>) =>
        (i.moduleCode as string) ||
        (i.module as string) ||
        (i.billingCategory as string) ||
        "CORE",
    );

    const subscriberType = body.customer.type === "OWNER" ? "OWNER" : "CORPORATE";
    const checkout = await createSubscriptionCheckout({
      subscriberType,
      tenantId: subscriberType === "CORPORATE" ? user.orgId : undefined,
      ownerUserId: subscriberType === "OWNER" ? user.id : undefined,
      modules,
      seats: body.seatTotal,
      billingCycle: body.billingCycle === "annual" ? "ANNUAL" : "MONTHLY",
      currency: quote.currency === "SAR" ? "SAR" : "USD",
      customer: {
        name: customer.name,
        email: body.customer.billingEmail,
        phone: customer.phone,
      },
      priceBookId: body.priceBookId,
      metadata: {
        planType: body.planType,
        items: body.items,
        billingCycle: body.billingCycle,
      },
    });

    if (checkout.requiresQuote) {
      return NextResponse.json({
        requiresQuote: true,
        quote: checkout.quote,
      });
    }

    return NextResponse.json({
      requiresQuote: false,
      subscriptionId: checkout.subscriptionId,
      cartId: checkout.cartId,
      redirectUrl: checkout.redirectUrl,
      quote,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, req);
    }
    logger.error(
      "Subscription creation failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse(
      { error: "Failed to create subscription" },
      500,
      req,
    );
  }
}
