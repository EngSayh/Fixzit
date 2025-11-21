import PaymentMethod from '@/server/models/PaymentMethod';
import Subscription from '@/server/models/Subscription';

import {
  normalizePaytabsCallbackPayload,
  type PaytabsCallbackPayload,
} from '@/lib/payments/paytabs-callback.contract';
import { provisionSubscriber } from './provision';

export type NormalizedPayTabsPayload = PaytabsCallbackPayload;

export function normalizePayTabsPayload(data: unknown): NormalizedPayTabsPayload {
  return normalizePaytabsCallbackPayload(data);
}

/**
 * Calculate the next billing date based on billing cycle
 * Handles month-end edge cases by capping to last day of month
 */
function calculateNextBillingDate(billingCycle: 'MONTHLY' | 'ANNUAL'): Date {
  const nextDate = new Date();
  nextDate.setUTCHours(0, 0, 0, 0);
  
  if (billingCycle === 'MONTHLY') {
    // Get current day to preserve billing day-of-month
    const currentDay = nextDate.getUTCDate();
    nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
    
    // Handle month-end edge cases (e.g., Jan 31 -> Feb 28/29)
    // If the day changed after setMonth, it overflowed to next month
    if (nextDate.getUTCDate() < currentDay) {
      // Set to last day of the intended month
      nextDate.setUTCDate(0);
    }
  } else {
    nextDate.setUTCFullYear(nextDate.getUTCFullYear() + 1);
  }
  
  return nextDate;
}

export async function finalizePayTabsTransaction(payload: NormalizedPayTabsPayload) {
  if (!payload.cartId) {
    throw new Error('Missing cart identifier');
  }

  const subscription = await Subscription.findOne({ 'paytabs.cart_id': payload.cartId });
  if (!subscription) {
    throw new Error('Subscription not found for cart');
  }

  if (payload.respStatus !== 'A') {
    subscription.status = 'PAST_DUE';
    await subscription.save();
    return { ok: false, subscription };
  }

  if (payload.token) {
    await PaymentMethod.findOneAndUpdate(
      { pt_token: payload.token },
      {
        pt_token: payload.token,
        pt_customer_email: payload.customerEmail,
        pt_masked_card: payload.maskedCard,
        org_id: subscription.subscriber_type === 'CORPORATE' ? subscription.tenant_id : undefined,
        owner_user_id: subscription.subscriber_type === 'OWNER' ? subscription.owner_user_id : undefined,
      },
      { upsert: true }
    );
  }

  subscription.status = 'ACTIVE';
  subscription.amount = payload.amount ?? subscription.amount;
  const incomingCurrency =
    typeof payload.currency === 'string'
      ? payload.currency.toUpperCase()
      : undefined;
  if (incomingCurrency === 'USD' || incomingCurrency === 'SAR') {
    subscription.currency = incomingCurrency;
  }
  
  // Set next_billing_date for recurring subscriptions
  if (!subscription.next_billing_date) {
    subscription.next_billing_date = calculateNextBillingDate(subscription.billing_cycle);
  }
  
  subscription.paytabs = {
    ...(subscription.paytabs || {}),
    token: payload.token ?? subscription.paytabs?.token,
    last_tran_ref: payload.tranRef,
    customer_email: payload.customerEmail ?? subscription.paytabs?.customer_email,
    cart_id: subscription.paytabs?.cart_id,
    profile_id: subscription.paytabs?.profile_id,
  };
  
  // Record successful payment in billing history
  subscription.billing_history.push({
    date: new Date(),
    amount: subscription.amount,
    currency: subscription.currency,
    tran_ref: payload.tranRef,
    status: 'SUCCESS'
  });
  
  await subscription.save();

  if (
    subscription.subscriber_type === 'OWNER' &&
    subscription.metadata &&
    typeof subscription.metadata === 'object' &&
    'ownerGroup' in subscription.metadata
  ) {
  const meta = subscription.metadata.ownerGroup as Record<string, unknown>;
    if (meta?.name) {
      const { OwnerGroupModel } = await import('@/server/models/OwnerGroup');
      await OwnerGroupModel.findOneAndUpdate(
        {
          name: meta.name,
          primary_contact_user_id: meta.primary_contact_user_id || subscription.owner_user_id,
        },
        {
          name: meta.name,
          primary_contact_user_id: meta.primary_contact_user_id || subscription.owner_user_id,
          member_user_ids: meta.member_user_ids || [],
          fm_provider_org_id: meta.fm_provider_org_id,
          agent_org_id: meta.agent_org_id,
          property_ids: meta.property_ids || [],
        },
        { upsert: true, new: true }
      );
    }
  }

  await provisionSubscriber(payload.cartId);

  return { ok: true, subscription };
}
