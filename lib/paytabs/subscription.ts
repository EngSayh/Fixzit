/**
 * PayTabs Subscription Business Logic
 * Canonical location for subscription-related PayTabs operations
 * 
 * Functions: normalizePayTabsPayload, finalizePayTabsTransaction
 * 
 * @module lib/paytabs/subscription
 */

import PaymentMethod from '../../server/models/PaymentMethod';
import Subscription from '../../server/models/Subscription';
import OwnerGroup from '../../server/models/OwnerGroup';
import { provisionSubscriber } from '../../services/provision';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// PAYLOAD NORMALIZATION
// ============================================================================

/**
 * Normalize PayTabs callback payload to standard format
 * Handles different payload structures from PayTabs API
 * 
 * @param data Raw PayTabs callback data
 * @returns Normalized payload
 */
export function normalizePayTabsPayload(data: Record<string, unknown>): NormalizedPayTabsPayload {
  const paymentInfo = (data?.payment_info as Record<string, unknown> | undefined) || {};
  
  return {
    tran_ref: (data?.tran_ref as string | undefined) || (data?.tranRef as string | undefined),
    respStatus: ((data?.payment_result as Record<string, unknown> | undefined)?.response_status as string | undefined) || (data?.respStatus as string | undefined),
    token: data?.token as string | undefined,
    customer_email:
      ((data?.customer_details as Record<string, unknown> | undefined)?.email as string | undefined) ||
      (data?.customerEmail as string | undefined) ||
      (paymentInfo?.customer_email as string | undefined),
    cart_id: (data?.cart_id as string | undefined) || (data?.cartId as string | undefined),
    amount: Number(data?.cart_amount || data?.tran_total || data?.amount),
    currency: (data?.cart_currency as string | undefined) || (data?.tran_currency as string | undefined) || (data?.currency as string | undefined),
    maskedCard: paymentInfo?.payment_description as string | undefined,
  };
}

// ============================================================================
// TRANSACTION FINALIZATION
// ============================================================================

/**
 * Finalize PayTabs transaction and update subscription status
 * 
 * Handles:
 * - Payment success: Activates subscription, saves payment method
 * - Payment failure: Marks subscription as PAST_DUE
 * - Owner group provisioning for OWNER subscriber type
 * - Subscriber provisioning
 * 
 * @param payload Normalized PayTabs payload
 * @returns Transaction result with subscription
 */
export async function finalizePayTabsTransaction(
  payload: NormalizedPayTabsPayload
) {
  // Validate cart identifier
  if (!payload.cart_id) {
    throw new Error('Missing cart identifier');
  }

  // Find subscription by cart_id
  const subscription = await Subscription.findOne({
    'paytabs.cart_id': payload.cart_id,
  });
  
  if (!subscription) {
    throw new Error('Subscription not found for cart');
  }

  // Handle payment failure
  if (payload.respStatus !== 'A') {
    subscription.status = 'PAST_DUE';
    await subscription.save();
    return { ok: false, subscription };
  }

  // Save payment method if token provided
  if (payload.token) {
    await PaymentMethod.findOneAndUpdate(
      { pt_token: payload.token },
      {
        pt_token: payload.token,
        pt_customer_email: payload.customer_email,
        pt_masked_card: payload.maskedCard,
        org_id:
          subscription.subscriber_type === 'CORPORATE'
            ? subscription.tenant_id
            : undefined,
        owner_user_id:
          subscription.subscriber_type === 'OWNER'
            ? subscription.owner_user_id
            : undefined,
      },
      { upsert: true }
    );
  }

  // Update subscription with payment success
  subscription.status = 'ACTIVE';
  subscription.amount = payload.amount ?? subscription.amount;
  subscription.currency = (payload.currency as unknown) || subscription.currency;
  subscription.paytabs = {
    ...(subscription.paytabs || {}),
    token: payload.token ?? subscription.paytabs?.token,
    last_tran_ref: payload.tran_ref,
    customer_email:
      payload.customer_email ?? subscription.paytabs?.customer_email,
    cart_id: subscription.paytabs?.cart_id,
    profile_id: subscription.paytabs?.profile_id,
  } as unknown;
  
  await subscription.save();

  // Handle owner group provisioning for OWNER subscriber type
  if (
    subscription.subscriber_type === 'OWNER' &&
    subscription.metadata &&
    typeof subscription.metadata === 'object' &&
    'ownerGroup' in subscription.metadata
  ) {
    const meta = subscription.metadata.ownerGroup as Record<string, unknown> | undefined;
    
    if (meta?.name) {
      await OwnerGroup.findOneAndUpdate(
        {
          name: meta.name as string,
          primary_contact_user_id:
            (meta.primary_contact_user_id as string | undefined) || subscription.owner_user_id,
        },
        {
          name: meta.name as string,
          primary_contact_user_id:
            (meta.primary_contact_user_id as string | undefined) || subscription.owner_user_id,
          member_user_ids: (meta.member_user_ids as string[] | undefined) || [],
          fm_provider_org_id: meta.fm_provider_org_id as string | undefined,
          agent_org_id: meta.agent_org_id as string | undefined,
          property_ids: meta.property_ids || [],
        },
        { upsert: true, new: true }
      );
    }
  }

  // Provision subscriber
  await provisionSubscriber(payload.cart_id);

  return { ok: true, subscription };
}
