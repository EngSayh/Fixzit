/**
 * Subscription Checkout Service
 * 
 * Creates subscription checkout sessions using TAP Payments API.
 * This module handles the complete checkout flow including:
 * - Price book lookup
 * - Quote generation
 * - Subscription creation
 * - Payment session initiation
 * 
 * @module lib/finance/checkout
 * @since v2.0.0 - Migrated to TAP Payments
 */

import PriceBook from "@/server/models/PriceBook";
import Subscription from "@/server/models/Subscription";
import { quotePrice, BillingCycle, QuoteResult } from "./pricing";
import { tapPayments, buildTapCustomer, type TapChargeRequest } from "./tap-payments";
import { logger } from "@/lib/logger";

type QuoteSuccess = Extract<QuoteResult, { requiresQuote: false }>;

type QuoteFailure = Extract<QuoteResult, { requiresQuote: true }>;

interface CustomerDetails {
  name: string;
  email: string;
  phone?: string;
}

interface CheckoutInput {
  subscriberType: "CORPORATE" | "OWNER";
  tenantId?: string;
  ownerUserId?: string;
  modules: string[];
  seats: number;
  billingCycle: BillingCycle;
  currency: "USD" | "SAR";
  customer: CustomerDetails;
  priceBookId?: string;
  metadata?: Record<string, unknown>;
}

interface CheckoutSuccess {
  requiresQuote: false;
  subscriptionId: string;
  cartId: string;
  redirectUrl: string;
  quote: QuoteSuccess;
}

interface CheckoutRequiresQuote {
  requiresQuote: true;
  quote: QuoteFailure;
}

/**
 * Create a subscription checkout session using TAP Payments
 * 
 * @param input - Checkout parameters including customer, modules, and billing options
 * @returns Checkout result with redirect URL or quote request
 * @throws Error if TAP is not configured or PriceBook not found
 */
export async function createSubscriptionCheckout(
  input: CheckoutInput,
): Promise<CheckoutSuccess | CheckoutRequiresQuote> {
  const billingCycle = input.billingCycle;
  const currency = input.currency;

  // Validate TAP configuration
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

  if (!appUrl) {
    throw new Error("APP_URL environment variable is not configured");
  }

  // PLATFORM-WIDE: PriceBook is global configuration
  const priceBook = input.priceBookId
    ? await PriceBook.findById(input.priceBookId).lean()
    : await PriceBook.findOne({ currency, active: true }).lean();

  if (!priceBook) {
    throw new Error("PriceBook not found");
  }

  const quote = await quotePrice({
    priceBookCurrency: currency,
    seats: input.seats,
    modules: input.modules,
    billingCycle,
  });

  if (quote.requiresQuote) {
    return { requiresQuote: true, quote };
  }

  const now = new Date();
  const periodLengthDays = billingCycle === "ANNUAL" ? 365 : 30;
  const periodEnd = new Date(now.getTime() + periodLengthDays * 24 * 60 * 60 * 1000);

  // Create subscription with TAP payment info
  const subscription = await Subscription.create({
    tenant_id:
      input.subscriberType === "CORPORATE" ? input.tenantId : undefined,
    owner_user_id:
      input.subscriberType === "OWNER" ? input.ownerUserId : undefined,
    subscriber_type: input.subscriberType,
    modules: input.modules,
    seats: input.seats,
    billing_cycle: billingCycle,
    currency,
    price_book_id: priceBook._id,
    amount: quote.total,
    status: "INCOMPLETE",
    tap: {
      customerEmail: input.customer.email,
    },
    metadata: input.metadata,
    current_period_start: now,
    current_period_end: periodEnd,
    next_billing_date: periodEnd,
  });

  const cartId = `SUB-${subscription._id.toString()}`;

  // Parse customer name into first/last
  const nameParts = input.customer.name.trim().split(/\s+/);
  const firstName = nameParts[0] || "Customer";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Build TAP charge request
  const chargeRequest: TapChargeRequest = {
    amount: quote.total,
    currency,
    customer: buildTapCustomer({
      firstName,
      lastName,
      email: input.customer.email,
      phone: input.customer.phone,
    }),
    redirect: {
      url: `${appUrl}/api/payments/tap/callback?subscription_id=${subscription._id.toString()}`,
    },
    post: {
      url: `${appUrl}/api/payments/tap/webhook`,
    },
    description: `${input.subscriberType} subscription - ${input.modules.join(", ")}`,
    metadata: {
      subscriptionId: subscription._id.toString(),
      cartId,
      subscriberType: input.subscriberType,
      ...(input.tenantId && { tenantId: input.tenantId }),
      ...(input.ownerUserId && { ownerUserId: input.ownerUserId }),
    },
    reference: {
      transaction: subscription._id.toString(),
      order: cartId,
    },
    receipt: {
      email: true,
      sms: Boolean(input.customer.phone),
    },
  };

  try {
    // Create TAP charge
    const chargeResponse = await tapPayments.createCharge(chargeRequest);

    // Update subscription with TAP charge info
    subscription.tap = {
      customerEmail: input.customer.email,
      // chargeId kept for backward compatibility; lastChargeId is canonical
      chargeId: chargeResponse.id,
      lastChargeId: chargeResponse.id,
    };
    subscription.amount = quote.total;
    await subscription.save();

    logger.info("[Checkout] TAP charge created", {
      subscriptionId: subscription._id.toString(),
      chargeId: chargeResponse.id,
      amount: quote.total,
      currency,
    });

    return {
      requiresQuote: false,
      subscriptionId: subscription._id.toString(),
      cartId,
      redirectUrl: chargeResponse.transaction.url,
      quote,
    };
  } catch (error) {
    // NO_TENANT_SCOPE: Cleanup own subscription document on payment failure
    await subscription.deleteOne();
    logger.error("[Checkout] Failed to create TAP charge", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(`Failed to create payment session: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
