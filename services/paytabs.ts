import PaymentMethod from '@/server/models/PaymentMethod';
import Subscription from '@/server/models/Subscription';
import OwnerGroup from '@/server/models/OwnerGroup';
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

export function normalizePayTabsPayload(data: any): NormalizedPayTabsPayload {
  const paymentInfo = data?.payment_info || {};
  return {
    tran_ref: data?.tran_ref || data?.tranRef,
    respStatus: data?.payment_result?.response_status || data?.respStatus,
    token: data?.token,
    customer_email:
      data?.customer_details?.email || data?.customerEmail || paymentInfo?.customer_email,
    cart_id: data?.cart_id || data?.cartId,
    amount: Number(data?.cart_amount || data?.tran_total || data?.amount),
    currency: data?.cart_currency || data?.tran_currency || data?.currency,
    maskedCard: paymentInfo?.payment_description,
  };
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
  subscription.paytabs = {
    ...(subscription.paytabs || {}),
    token: payload.token ?? subscription.paytabs?.token,
    last_tran_ref: payload.tran_ref,
    customer_email: payload.customer_email ?? subscription.paytabs?.customer_email,
    cart_id: subscription.paytabs?.cart_id,
    profile_id: subscription.paytabs?.profile_id,
  } as unknown;
  await subscription.save();

  if (
    subscription.subscriber_type === 'OWNER' &&
    subscription.metadata &&
    typeof subscription.metadata === 'object' &&
    'ownerGroup' in subscription.metadata
  ) {
    const meta: any = subscription.metadata.ownerGroup;
    if (meta?.name) {
      await OwnerGroup.findOneAndUpdate(
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

