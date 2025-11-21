// Subscription Billing Service
// Handles recurring billing, trial management, and subscription lifecycle

import { Types } from 'mongoose';
import Subscription from '../models/Subscription';
import PriceBook from '../models/PriceBook';
import { connectToDatabase } from '../../lib/mongodb-unified';
import { logger } from '@/lib/logger';

export interface PayTabsChargeResult {
  tran_ref: string;
  status: 'SUCCESS' | 'FAILED';
  error_message?: string;
  amount: number;
  currency: string;
}

export interface PayTabsClient {
  chargeRecurring(_payload: {
    profileId: string;
    token: string;
    customerEmail: string;
    amount: number;
    currency: string;
    cartId?: string;
  }): Promise<PayTabsChargeResult>;
}

export interface CreateSubscriptionInput {
  subscriberType: 'CORPORATE' | 'OWNER';
  tenantId?: string;
  ownerUserId?: string;
  priceBookId: string;
  modules: string[];
  seats: number;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  currency: 'USD' | 'SAR';
  autoRenew?: boolean;
}

function addBillingPeriod(from: Date, cycle: 'MONTHLY' | 'ANNUAL'): { periodStart: Date; periodEnd: Date; nextBillingDate: Date } {
  const periodStart = new Date(from);
  const periodEnd = new Date(from);
  periodEnd.setMonth(periodEnd.getMonth() + (cycle === 'ANNUAL' ? 12 : 1));
  return { periodStart, periodEnd, nextBillingDate: new Date(periodEnd) };
}

type SubscriptionDocument = Awaited<ReturnType<typeof Subscription.findById>>;
type SubscriptionNonNull = NonNullable<SubscriptionDocument>;

export async function createSubscriptionFromCheckout(input: CreateSubscriptionInput): Promise<SubscriptionNonNull> {
  await connectToDatabase();
  
  const priceBook = await PriceBook.findById(input.priceBookId);
  if (!priceBook) throw new Error('Invalid price_book_id');
  
  const created = await Subscription.create({
    subscriber_type: input.subscriberType,
    tenant_id: input.subscriberType === 'CORPORATE' ? input.tenantId : undefined,
    owner_user_id: input.subscriberType === 'OWNER' ? input.ownerUserId : undefined,
    price_book_id: new Types.ObjectId(input.priceBookId),
    modules: input.modules,
    seats: input.seats,
    billing_cycle: input.billingCycle,
    currency: input.currency,
    amount: 0, // Will be calculated
    status: 'INCOMPLETE',
  }) as SubscriptionNonNull;
  
  logger.info('[Subscription] Created new subscription', { id: created._id });
  return created;
}

export async function markSubscriptionPaid(subscriptionId: string, charge: PayTabsChargeResult): Promise<SubscriptionDocument> {
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
  
  if (charge.status === 'SUCCESS') {
    sub.status = 'ACTIVE';
    const { nextBillingDate } = addBillingPeriod(now, sub.billing_cycle);
    sub.next_billing_date = nextBillingDate;
    
    if (sub.metadata) {
      sub.metadata.zatca_invoice_ref = charge.tran_ref;
    } else {
      sub.metadata = { zatca_invoice_ref: charge.tran_ref };
    }
  } else {
    sub.status = 'PAST_DUE';
  }
  
  await sub.save();
  logger.info('[Subscription] Marked paid', { id: subscriptionId, status: charge.status });
  return sub;
}

export async function runRecurringBillingJob(payTabsClient: PayTabsClient, now = new Date()): Promise<{ processed: number; succeeded: number; failed: number }> {
  await connectToDatabase();
  
  const dueSubs = await Subscription.find({
    status: 'ACTIVE',
    next_billing_date: { $lte: now },
  });
  
  let processed = 0, succeeded = 0, failed = 0;
  
  for (const sub of dueSubs) {
    processed++;
    
    if (!sub.paytabs || !sub.paytabs.token) {
      sub.status = 'PAST_DUE';
      sub.billing_history.push({
        date: now,
        amount: sub.amount,
        currency: sub.currency,
        tran_ref: '',
        status: 'FAILED',
        error: 'Missing PayTabs token',
      });
      await sub.save();
      failed++;
      continue;
    }
    
    try {
      const result = await payTabsClient.chargeRecurring({
        profileId: sub.paytabs.profile_id || '',
        token: sub.paytabs.token,
        customerEmail: sub.paytabs.customer_email || '',
        amount: sub.amount,
        currency: sub.currency,
        cartId: sub.paytabs.cart_id,
      });
      
      await markSubscriptionPaid(sub._id.toString(), result);
      if (result.status === 'SUCCESS') succeeded++;
      else failed++;
    } catch (error) {
      logger.error('[Subscription] Billing failed', { id: sub._id, error });
      failed++;
    }
  }
  
  logger.info('[Subscription] Recurring billing completed', { processed, succeeded, failed });
  return { processed, succeeded, failed };
}

export async function cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true): Promise<SubscriptionDocument> {
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
    sub.status = 'CANCELED';
    sub.next_billing_date = undefined;
  }
  
  await sub.save();
  logger.info('[Subscription] Canceled', { id: subscriptionId, immediate: !cancelAtPeriodEnd });
  return sub;
}
