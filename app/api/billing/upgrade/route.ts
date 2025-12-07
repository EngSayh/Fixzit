import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import Subscription from "@/server/models/Subscription";
import { computeQuote } from "@/lib/pricing";
import { createSubscriptionCheckout } from "@/lib/finance/checkout";
import { logger } from "@/lib/logger";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError, zodValidationError } from "@/server/utils/errorResponses";
import { createSecureResponse, getClientIP } from "@/server/security/headers";
import { canManageSubscriptions } from "@/lib/auth/role-guards";
import { Types } from "mongoose";
import PriceBook from "@/server/models/PriceBook";
import { EMAIL_DOMAINS } from "@/lib/config/domains";

/**
 * Plan upgrade request schema
 */
const upgradeSchema = z.object({
  targetPlan: z.enum(["STANDARD", "PRO", "PREMIUM", "ENTERPRISE"]),
  billingCycle: z.enum(["monthly", "annual"]).optional(),
  additionalSeats: z.number().int().min(0).optional(),
  additionalModules: z.array(z.string()).optional(),
  priceBookId: z.string().optional(),
});

/**
 * Plan configurations with module mappings
 */
const PLAN_CONFIGS: Record<string, { modules: string[]; baseSeats: number; allowedAddons: string[] }> = {
  STANDARD: {
    modules: ["CORE", "WORK_ORDERS", "PROPERTIES"],
    baseSeats: 3,
    allowedAddons: [], // No add-ons for STANDARD
  },
  PRO: {
    modules: ["CORE", "WORK_ORDERS", "PROPERTIES", "FINANCE", "HR", "CRM", "MARKETPLACE"],
    baseSeats: 10,
    allowedAddons: ["COMPLIANCE", "API"], // Limited add-ons for PRO
  },
  PREMIUM: {
    modules: ["CORE", "WORK_ORDERS", "PROPERTIES", "FINANCE", "HR", "CRM", "MARKETPLACE", "COMPLIANCE"],
    baseSeats: 25,
    allowedAddons: ["API", "SSO", "ADVANCED_ANALYTICS"], // More add-ons for PREMIUM
  },
  ENTERPRISE: {
    modules: ["CORE", "WORK_ORDERS", "PROPERTIES", "FINANCE", "HR", "CRM", "MARKETPLACE", "COMPLIANCE", "API", "SSO"],
    baseSeats: -1, // Unlimited
    allowedAddons: ["WHITE_LABEL", "MULTI_REGION", "CUSTOM_INTEGRATIONS"], // Enterprise-only add-ons
  },
};

/**
 * POST /api/billing/upgrade
 * 
 * Upgrades the user's subscription to a higher plan.
 * Calculates proration and creates a checkout session.
 * 
 * @openapi
 * /api/billing/upgrade:
 *   post:
 *     summary: Upgrade subscription plan
 *     tags: [billing]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetPlan
 *             properties:
 *               targetPlan:
 *                 type: string
 *                 enum: [STANDARD, PRO, PREMIUM, ENTERPRISE]
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, annual]
 *               additionalSeats:
 *                 type: integer
 *                 minimum: 0
 *               additionalModules:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Upgrade checkout created
 *       400:
 *         description: Invalid upgrade request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  // Rate limiting - SECURITY: Use distributed rate limiting (Redis)
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 10, 300_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    // Authenticate
    const session = await auth();
    if (!session?.user?.id) {
      return createSecureResponse({ error: "Authentication required" }, 401, req);
    }

    const user = session.user as { 
      id: string; 
      orgId?: string; 
      role?: string;
      email?: string;
      name?: string;
    };

    if (!user.orgId) {
      return createSecureResponse({ error: "Organization context required" }, 400, req);
    }

    // Check permissions
    if (!canManageSubscriptions(user.role)) {
      return createSecureResponse(
        { error: "Insufficient permissions to manage subscriptions" },
        403,
        req
      );
    }

    // Additional rate limiting per tenant - SECURITY: Distributed for multi-instance
    const tenantRl = await smartRateLimit(`billing:upgrade:${user.orgId}`, 3, 300_000);
    if (!tenantRl.allowed) {
      return createSecureResponse(
        { error: "Upgrade rate limit exceeded. Please wait before trying again." },
        429,
        req
      );
    }

    // Parse and validate request body
    const body = upgradeSchema.parse(await req.json());
    const { targetPlan, billingCycle, additionalSeats = 0, additionalModules = [] } = body;

    await connectToDatabase();

    // Find current subscription
    const orgObjectId = new Types.ObjectId(user.orgId);
    const currentSub = await Subscription.findOne({
      $or: [
        { tenant_id: orgObjectId, status: { $in: ["ACTIVE", "TRIAL"] } },
        { owner_user_id: new Types.ObjectId(user.id), status: { $in: ["ACTIVE", "TRIAL"] } },
      ],
    }).sort({ createdAt: -1 });

    // Get current plan level
    const PLAN_HIERARCHY = { BASIC: 0, STANDARD: 1, PRO: 2, PREMIUM: 3, ENTERPRISE: 4 };
    const currentPlan =
      (currentSub?.get?.("plan") as string | undefined) || "BASIC";
    const currentLevel = PLAN_HIERARCHY[currentPlan as keyof typeof PLAN_HIERARCHY] ?? 0;
    const targetLevel = PLAN_HIERARCHY[targetPlan as keyof typeof PLAN_HIERARCHY];

    // Validate upgrade path
    if (targetLevel <= currentLevel) {
      return createSecureResponse(
        { 
          error: "Invalid upgrade path",
          message: `Cannot upgrade from ${currentPlan} to ${targetPlan}. Target plan must be higher tier.`,
          currentPlan,
          targetPlan,
        },
        400,
        req
      );
    }

    // Get plan configuration
    const planConfig = PLAN_CONFIGS[targetPlan];
    if (!planConfig) {
      return createSecureResponse({ error: "Invalid target plan" }, 400, req);
    }

    // Validate additionalModules against allowed add-ons for the target plan
    const allAllowedModules = new Set([...planConfig.modules, ...planConfig.allowedAddons]);
    const validAddons = additionalModules.filter((m) => allAllowedModules.has(m));
    const invalidAddons = additionalModules.filter((m) => !allAllowedModules.has(m));
    
    if (invalidAddons.length > 0) {
      return createSecureResponse(
        {
          error: "Invalid module selection",
          message: `The following modules are not available for ${targetPlan} plan: ${invalidAddons.join(", ")}`,
          invalidModules: invalidAddons,
          allowedAddons: planConfig.allowedAddons,
        },
        400,
        req
      );
    }

    // Calculate seats - handle unlimited (ENTERPRISE) properly
    // For unlimited plans, don't use a hard-coded fallback; use undefined for unlimited semantics
    const isUnlimitedSeats = planConfig.baseSeats === -1;
    const baseSeats = isUnlimitedSeats ? undefined : planConfig.baseSeats;
    // Ensure seatTotal is never 0 for priced plans; unlimited still passes a sentinel seat count
    const totalSeats = isUnlimitedSeats ? 1 : (baseSeats! + additionalSeats);

    // Build modules list (only include valid add-ons)
    const modules = [...new Set([...planConfig.modules, ...validAddons])];

    // Build quote items
    const items = modules.map((moduleCode) => ({
      moduleCode,
      seatCount: 1,
    }));

    // Calculate upgrade quote with proration
    const effectiveBillingCycle = billingCycle || 
      (currentSub?.billing_cycle === "ANNUAL" ? "annual" : "monthly");

    const quote = await computeQuote({
      items,
      seatTotal: totalSeats,
      billingCycle: effectiveBillingCycle,
      isUnlimited: isUnlimitedSeats, // Signal unlimited plan for special pricing
    });

    // Calculate proration if upgrading mid-cycle
    let prorationCredit = 0;
    if (currentSub?.amount) {
      const now = new Date();
      const billingCycleCode = (currentSub.billing_cycle || "")
        .toString()
        .toUpperCase();
      const cycleDays = billingCycleCode === "ANNUAL" ? 365 : 30;

      // Prefer explicit current_period_start/end; then next_billing_date/activeUntil; fallback to updatedAt/createdAt
      const periodEnd =
        currentSub.current_period_end ||
        currentSub.next_billing_date ||
        (currentSub.get?.("activeUntil") as Date | undefined) ||
        currentSub.updatedAt ||
        currentSub.createdAt;
      const cycleEnd = new Date(periodEnd);
      const cycleStart =
        currentSub.current_period_start ||
        new Date(cycleEnd.getTime() - cycleDays * 24 * 60 * 60 * 1000);

      const totalDays = Math.max(
        1,
        (cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      const remainingDays = Math.max(
        0,
        (cycleEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Credit for unused time on current plan based on current billing cycle window
      prorationCredit =
        Math.round(currentSub.amount * (remainingDays / totalDays) * 100) / 100;
    }

    // Validate price book selection (must exist, be active, and match currency)
    let priceBookId: string | undefined;
    if (body.priceBookId) {
      const priceBook = await PriceBook.findOne({
        _id: body.priceBookId,
        active: true,
      })
        .lean()
        .exec();

      if (!priceBook) {
        return createSecureResponse(
          { error: "Invalid price book selection" },
          400,
          req,
        );
      }

      if (priceBook.currency !== quote.currency) {
        return createSecureResponse(
          {
            error: "Price book currency mismatch",
            message: `Price book currency ${priceBook.currency} does not match quote currency ${quote.currency}`,
          },
          400,
          req,
        );
      }

      priceBookId = priceBook._id.toString();
    }

    // Contact sales for enterprise custom pricing
    if (targetPlan === "ENTERPRISE" || quote.contactSales) {
      return createSecureResponse(
        {
          action: "CONTACT_SALES",
          message: "Enterprise plans require custom pricing. Our sales team will contact you.",
          currentPlan,
          targetPlan,
          estimatedQuote: quote,
          contact: EMAIL_DOMAINS.sales,
        },
        200,
        req
      );
    }

    // Calculate final amount after proration
    const finalAmount = Math.max(0, quote.total - prorationCredit);

    // Create upgrade checkout
    const subscriberType = currentSub?.subscriber_type || "CORPORATE";
    const checkout = await createSubscriptionCheckout({
      subscriberType,
      tenantId: user.orgId,
      ownerUserId: subscriberType === "OWNER" ? user.id : undefined,
      modules,
      seats: totalSeats ?? -1, // -1 signals unlimited seats
      billingCycle: effectiveBillingCycle === "annual" ? "ANNUAL" : "MONTHLY",
      currency: quote.currency === "SAR" ? "SAR" : "USD",
      customer: {
        name: user.name || "Organization Admin",
        email: user.email || "",
        phone: undefined,
      },
      priceBookId,
      metadata: {
        upgradeFrom: currentPlan,
        upgradeTo: targetPlan,
        prorationCredit,
        originalSubscriptionId: currentSub?._id?.toString(),
        billingCycle: effectiveBillingCycle,
      },
    });

    if (checkout.requiresQuote) {
      return createSecureResponse(
        {
          success: false,
          requiresQuote: true,
          quote: checkout.quote,
        },
        200,
        req,
      );
    }

    // Log upgrade attempt
    logger.info("[billing/upgrade] Upgrade checkout created", {
      userId: user.id,
      orgId: user.orgId,
      currentPlan,
      targetPlan,
      prorationCredit,
      finalAmount,
      checkoutId: checkout.cartId,
    });

    return createSecureResponse(
      {
        success: true,
        checkout: {
          subscriptionId: checkout.subscriptionId,
          cartId: checkout.cartId,
          redirectUrl: checkout.redirectUrl,
        },
        upgrade: {
          from: currentPlan,
          to: targetPlan,
          modules,
          seats: isUnlimitedSeats ? "Unlimited" : totalSeats,
          billingCycle: effectiveBillingCycle,
        },
        pricing: {
          subtotal: quote.subtotal,
          discount: 0,
          prorationCredit,
          total: finalAmount,
          currency: quote.currency,
        },
      },
      200,
      req
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, req);
    }

    logger.error("[billing/upgrade] Upgrade failed", { 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
    
    return createSecureResponse(
      { error: "Failed to create upgrade checkout" },
      500,
      req
    );
  }
}

/**
 * GET /api/billing/upgrade
 * 
 * Returns available upgrade options for the current subscription.
 */
export async function GET(req: NextRequest) {
  // Rate limiting - SECURITY: Use distributed rate limiting (Redis)
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 30, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createSecureResponse({ error: "Authentication required" }, 401, req);
    }

    const user = session.user as { id: string; orgId?: string };
    if (!user.orgId) {
      return createSecureResponse({ error: "Organization context required" }, 400, req);
    }

    await connectToDatabase();

    // Find current subscription
    const orgObjectId = new Types.ObjectId(user.orgId);
    const currentSub = await Subscription.findOne({
      $or: [
        { tenant_id: orgObjectId, status: { $in: ["ACTIVE", "TRIAL"] } },
        { owner_user_id: new Types.ObjectId(user.id), status: { $in: ["ACTIVE", "TRIAL"] } },
      ],
    }).sort({ createdAt: -1 }).lean();

    const currentPlan =
      (currentSub as { plan?: string } | null)?.plan || "BASIC";
    const PLAN_HIERARCHY = { BASIC: 0, STANDARD: 1, PRO: 2, PREMIUM: 3, ENTERPRISE: 4 };
    const currentLevel = PLAN_HIERARCHY[currentPlan as keyof typeof PLAN_HIERARCHY] ?? 0;

    // Generate available upgrade options
    const availableUpgrades = Object.entries(PLAN_CONFIGS)
      .filter(([plan]) => {
        const planLevel = PLAN_HIERARCHY[plan as keyof typeof PLAN_HIERARCHY];
        return planLevel > currentLevel;
      })
      .map(([plan, config]) => ({
        plan,
        modules: config.modules,
        baseSeats: config.baseSeats === -1 ? "Unlimited" : config.baseSeats,
        features: getPlanFeatures(plan),
      }));

    return createSecureResponse(
      {
        currentSubscription: currentSub ? {
          plan: currentPlan,
          status: currentSub.status,
          modules: currentSub.modules,
          seats: currentSub.seats,
          billingCycle: currentSub.billing_cycle,
          activeUntil: (currentSub as { activeUntil?: Date }).activeUntil,
        } : null,
        availableUpgrades,
      },
      200,
      req
    );
  } catch (error) {
    logger.error("[billing/upgrade] Failed to get upgrade options", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return createSecureResponse(
      { error: "Failed to get upgrade options" },
      500,
      req
    );
  }
}

/**
 * Get human-readable features for a plan
 */
function getPlanFeatures(plan: string): string[] {
  const features: Record<string, string[]> = {
    STANDARD: [
      "Up to 3 users",
      "Work order management",
      "Property management",
      "Email support",
    ],
    PRO: [
      "Up to 10 users",
      "Everything in Standard",
      "Finance & invoicing",
      "HR management",
      "CRM",
      "Marketplace access",
      "Priority support",
    ],
    PREMIUM: [
      "Up to 25 users",
      "Everything in Pro",
      "Compliance management",
      "Advanced reporting",
      "API access",
      "12-hour SLA",
    ],
    ENTERPRISE: [
      "Unlimited users",
      "Everything in Premium",
      "SSO/SCIM",
      "Dedicated support",
      "Custom SLA",
      "White labeling",
      "Multi-region",
    ],
  };

  return features[plan] || [];
}
