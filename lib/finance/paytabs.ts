import PaymentMethod from '@/server/models/PaymentMethod';
import Subscription from '@/server/models/Subscription';
import { provisionSubscriber } from './provision';

export interface NormalizedPayTabsPayload {
  tran_ref?: string;
  respStatus?: string;
  token?: string;
  customer_email?: string;
  cart_id?: string;
  amount?: number;
  currency?: string;
  maskedCard?: string;
}

export function normalizePayTabsPayload(data: unknown): NormalizedPayTabsPayload {
  if (typeof data !== 'object' || data === null) return {};
  const d = data as Record<string, unknown>;
  const paymentInfo = (d?.payment_info || {}) as Record<string, unknown>;
  const paymentResult = d?.payment_result as Record<string, unknown> | undefined;
  const customerDetails = d?.customer_details as Record<string, unknown> | undefined;
  
  return {
    tran_ref: String(d?.tran_ref || d?.tranRef || ''),
    respStatus: String(paymentResult?.response_status || d?.respStatus || ''),
    token: d?.token ? String(d.token) : undefined,
    customer_email: String(
      customerDetails?.email || d?.customerEmail || paymentInfo?.customer_email || ''
    ),
    cart_id: d?.cart_id ? String(d.cart_id) : (d?.cartId ? String(d.cartId) : undefined),
    amount: Number(d?.cart_amount || d?.tran_total || d?.amount || 0),
    currency: String(d?.cart_currency || d?.tran_currency || d?.currency || ''),
    maskedCard: paymentInfo?.payment_description ? String(paymentInfo.payment_description) : undefined,
  };
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
  if (!payload.cart_id) {
    throw new Error('Missing cart identifier');
  }

  const subscription = await Subscription.findOne({ 'paytabs.cart_id': payload.cart_id });
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
        pt_customer_email: payload.customer_email,
        pt_masked_card: payload.maskedCard,
        org_id: subscription.subscriber_type === 'CORPORATE' ? subscription.tenant_id : undefined,
        owner_user_id: subscription.subscriber_type === 'OWNER' ? subscription.owner_user_id : undefined,
      },
      { upsert: true }
    );
  }

  subscription.status = 'ACTIVE';
  subscription.amount = payload.amount ?? subscription.amount;
  subscription.currency = (payload.currency as unknown) || subscription.currency;
  
  // Set next_billing_date for recurring subscriptions
  if (!subscription.next_billing_date) {
    subscription.next_billing_date = calculateNextBillingDate(subscription.billing_cycle);
  }
  
  subscription.paytabs = {
    ...(subscription.paytabs || {}),
    token: payload.token ?? subscription.paytabs?.token,
    last_tran_ref: payload.tran_ref,
    customer_email: payload.customer_email ?? subscription.paytabs?.customer_email,
    cart_id: subscription.paytabs?.cart_id,
    profile_id: subscription.paytabs?.profile_id,
  } as unknown;
  
  // Record successful payment in billing history
  subscription.billing_history.push({
    date: new Date(),
    amount: subscription.amount,
    currency: subscription.currency,
    tran_ref: payload.tran_ref,
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

  await provisionSubscriber(payload.cart_id);

  return { ok: true, subscription };
}
