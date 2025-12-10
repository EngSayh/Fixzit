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
 * await chargeRecurringBilling(subscription._id, payTabsClient);
 */

import { Types } from "mongoose";
import Subscription from "../models/Subscription";
import PriceBook from "../models/PriceBook";
import { connectToDatabase } from "../../lib/mongodb-unified";
import { logger } from "@/lib/logger";

/**
 * Result from PayTabs recurring charge API
 */
export interface PayTabsChargeResult {
  /** Transaction reference from PayTabs */
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
 * PayTabs client interface for recurring charges
 */
export interface PayTabsClient {
  /**
   * Charge a saved card token for recurring billing
   * @param payload - Charge parameters
   * @returns Promise resolving to charge result
   */
  chargeRecurring(_payload: {
    profileId: string;
    token: string;
    customerEmail: string;
    amount: number;
    currency: string;
    cartId?: string;
  }): Promise<PayTabsChargeResult>;
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
  charge: PayTabsChargeResult,
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
  payTabsClient: PayTabsClient,
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

    if (!sub.paytabs || !sub.paytabs.token) {
      sub.status = "PAST_DUE";
      sub.billing_history.push({
        date: now,
        amount: sub.amount,
        currency: sub.currency,
        tran_ref: "",
        status: "FAILED",
        error: "Missing PayTabs token",
      });
      await sub.save();
      failed++;
      continue;
    }

    try {
      const result = await payTabsClient.chargeRecurring({
        profileId: sub.paytabs.profile_id || "",
        token: sub.paytabs.token,
        customerEmail: sub.paytabs.customer_email || "",
        amount: sub.amount,
        currency: sub.currency,
        cartId: sub.paytabs.cart_id,
      });

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
