/**
 * Subscription Billing Service
 * 
 * Handles recurring billing, trial management, and subscription lifecycle
 * for corporate and owner subscriptions.
 * 
 * @module server/services/subscriptionBillingService
 * @since v2.0.0
 * 
 * @example
 * // Create a new subscription
 * const subscription = await createSubscriptionFromCheckout({
 *   subscriberType: 'CORPORATE',
 *   priceBookId: '507f1f77bcf86cd799439011',
 *   modules: ['fm', 'hr'],
 *   seats: 10,
 *   billingCycle: 'MONTHLY',
 *   currency: 'SAR',
 * });
 * 
 * // Charge recurring billing
 * await chargeRecurringBilling(subscription._id, tapPayments);
 */

import { Types } from "mongoose";
import Subscription from "../models/Subscription";
import PriceBook from "../models/PriceBook";
import { connectToDatabase } from "../../lib/mongodb-unified";
import { logger } from "@/lib/logger";

/**
 * Result from TAP recurring charge API
 */
export interface TapChargeResult {
  /** Transaction reference from TAP */
  tran_ref: string;
  /** Charge status */
  status: "SUCCESS" | "FAILED";
  /** Error message if charge failed */
  error_message?: string;
  /** Amount charged */
  amount: number;
  /** Currency code (e.g., SAR, USD) */
  currency: string;
}

/**
 * TAP payments client interface for recurring charges
 */
export interface TapPaymentsClient {
  /**
   * Create a charge using a saved card token
   * @param request - Charge parameters
   * @returns Promise resolving to charge response
   */
  createCharge(request: {
    amount: number;
    currency: string;
    customer: {
      first_name: string;
      last_name: string;
      email: string;
      phone: { country_code: string; number: string };
    };
    source?: { id: string };
    redirect: { url: string };
    description?: string;
    metadata?: Record<string, string | number | boolean | undefined>;
  }): Promise<{
    id: string;
    status: string;
    response?: { code: string; message: string };
  }>;
}

/**
 * Input parameters for creating a new subscription
 */
export interface CreateSubscriptionInput {
  /** Type of subscriber (corporate org or individual owner) */
  subscriberType: "CORPORATE" | "OWNER";
  /** Tenant/Organization ID for corporate subscriptions */
  tenantId?: string;
  /** User ID for owner subscriptions */
  ownerUserId?: string;
  /** Price book ID defining pricing tiers */
  priceBookId: string;
  /** List of module slugs to enable */
  modules: string[];
  /** Number of user seats */
  seats: number;
  /** Billing frequency */
  billingCycle: "MONTHLY" | "ANNUAL";
  /** Billing currency */
  currency: "USD" | "SAR";
  /** Whether to auto-renew at period end */
  autoRenew?: boolean;
}

/**
 * Calculate billing period dates based on start date and cycle
 * @param from - Start date of the billing period
 * @param cycle - Billing cycle (monthly or annual)
 * @returns Object containing period dates
 * @internal
 */
function addBillingPeriod(
  from: Date,
  cycle: "MONTHLY" | "ANNUAL",
): { periodStart: Date; periodEnd: Date; nextBillingDate: Date } {
  const periodStart = new Date(from);
  const periodEnd = new Date(from);
  periodEnd.setMonth(periodEnd.getMonth() + (cycle === "ANNUAL" ? 12 : 1));
  return { periodStart, periodEnd, nextBillingDate: new Date(periodEnd) };
}

type SubscriptionDocument = Awaited<ReturnType<typeof Subscription.findById>>;
type SubscriptionNonNull = NonNullable<SubscriptionDocument>;

/**
 * Create a new subscription from checkout flow
 * 
 * @param input - Subscription creation parameters
 * @returns Promise resolving to created subscription document
 * @throws Error if price book ID is invalid
 * 
 * @example
 * const sub = await createSubscriptionFromCheckout({
 *   subscriberType: 'CORPORATE',
 *   tenantId: 'org123',
 *   priceBookId: 'price456',
 *   modules: ['fm', 'hr', 'finance'],
 *   seats: 25,
 *   billingCycle: 'ANNUAL',
 *   currency: 'SAR',
 *   autoRenew: true,
 * });
 */
export async function createSubscriptionFromCheckout(
  input: CreateSubscriptionInput,
): Promise<SubscriptionNonNull> {
  await connectToDatabase();

  const priceBook = await PriceBook.findById(input.priceBookId);
  if (!priceBook) throw new Error("Invalid price_book_id");

  const created = (await Subscription.create({
    subscriber_type: input.subscriberType,
    tenant_id:
      input.subscriberType === "CORPORATE" ? input.tenantId : undefined,
    owner_user_id:
      input.subscriberType === "OWNER" ? input.ownerUserId : undefined,
    price_book_id: new Types.ObjectId(input.priceBookId),
    modules: input.modules,
    seats: input.seats,
    billing_cycle: input.billingCycle,
    currency: input.currency,
    amount: 0, // Will be calculated
    status: "INCOMPLETE",
  })) as SubscriptionNonNull;

  logger.info("[Subscription] Created new subscription", { id: created._id });
  return created;
}

export async function markSubscriptionPaid(
  subscriptionId: string,
  charge: TapChargeResult,
): Promise<SubscriptionDocument> {
  await connectToDatabase();

  const sub = await Subscription.findById(subscriptionId);
  if (!sub) return null;

  const now = new Date();
  sub.billing_history.push({
    date: now,
    amount: charge.amount,
    currency: charge.currency,
    tran_ref: charge.tran_ref,
    status: charge.status,
    error: charge.error_message,
  });

  if (charge.status === "SUCCESS") {
    sub.status = "ACTIVE";
    const { nextBillingDate } = addBillingPeriod(now, sub.billing_cycle);
    sub.next_billing_date = nextBillingDate;

    if (sub.metadata) {
      sub.metadata.zatca_invoice_ref = charge.tran_ref;
    } else {
      sub.metadata = { zatca_invoice_ref: charge.tran_ref };
    }
  } else {
    sub.status = "PAST_DUE";
  }

  await sub.save();
  logger.info("[Subscription] Marked paid", {
    id: subscriptionId,
    status: charge.status,
  });
  return sub;
}

export async function runRecurringBillingJob(
  tapClient: TapPaymentsClient,
  now = new Date(),
): Promise<{ processed: number; succeeded: number; failed: number }> {
  await connectToDatabase();

  const dueSubs = await Subscription.find({
    status: "ACTIVE",
    next_billing_date: { $lte: now },
  });

  let processed = 0,
    succeeded = 0,
    failed = 0;

  for (const sub of dueSubs) {
    processed++;

    // Prefer TAP, fallback to PayTabs for legacy subscriptions
    const hasTap = sub.tap && sub.tap.cardId;
    const hasPaytabs = sub.paytabs && sub.paytabs.token;
    
    if (!hasTap && !hasPaytabs) {
      sub.status = "PAST_DUE";
      sub.billing_history.push({
        date: now,
        amount: sub.amount,
        currency: sub.currency,
        tran_ref: "",
        status: "FAILED",
        error: "Missing payment token",
      });
      await sub.save();
      failed++;
      continue;
    }

    try {
      // Use TAP for recurring charges
      const customerEmail = sub.tap?.customerEmail || sub.paytabs?.customer_email || "";
      const cardId = sub.tap?.cardId || sub.paytabs?.token || "";
      
      const chargeResponse = await tapClient.createCharge({
        amount: sub.amount,
        currency: sub.currency,
        customer: {
          first_name: "Customer",
          last_name: "",
          email: customerEmail,
          phone: { country_code: "966", number: "" },
        },
        source: { id: cardId },
        redirect: { url: process.env.NEXT_PUBLIC_APP_URL || "https://fixzit.app/billing/callback" },
        description: `Subscription renewal - ${sub._id}`,
        metadata: { subscriptionId: sub._id.toString() },
      });

      const result: TapChargeResult = {
        tran_ref: chargeResponse.id,
        status: chargeResponse.status === "CAPTURED" ? "SUCCESS" : "FAILED",
        error_message: chargeResponse.response?.message,
        amount: sub.amount,
        currency: sub.currency,
      };

      await markSubscriptionPaid(sub._id.toString(), result);
      if (result.status === "SUCCESS") succeeded++;
      else failed++;
    } catch (error) {
      logger.error("[Subscription] Billing failed", { id: sub._id, error });
      failed++;
    }
  }

  logger.info("[Subscription] Recurring billing completed", {
    processed,
    succeeded,
    failed,
  });
  return { processed, succeeded, failed };
}

export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd = true,
): Promise<SubscriptionDocument> {
  await connectToDatabase();

  const sub = await Subscription.findById(subscriptionId);
  if (!sub) return null;

  if (cancelAtPeriodEnd) {
    // Will cancel at end of current period
    if (sub.metadata) {
      sub.metadata.cancel_at_period_end = true;
    } else {
      sub.metadata = { cancel_at_period_end: true };
    }
  } else {
    // Cancel immediately
    sub.status = "CANCELED";
    sub.next_billing_date = undefined;
  }

  await sub.save();
  logger.info("[Subscription] Canceled", {
    id: subscriptionId,
    immediate: !cancelAtPeriodEnd,
  });
  return sub;
}
