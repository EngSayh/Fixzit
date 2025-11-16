// PayTabs Client for Recurring Payments

import { PayTabsChargeResult } from './subscriptionBillingService';
import { logger } from '@/lib/logger';

export class PayTabsClient {
  private serverKey = process.env.PAYTABS_SERVER_KEY || '';
  private profileId = process.env.PAYTABS_PROFILE_ID || '';

  async chargeRecurring(input: {
    profileId?: string;
    token: string;
    customerEmail: string;
    amount: number;
    currency: string;
    cartId?: string;
  }): Promise<PayTabsChargeResult> {
    if (!this.serverKey || !this.profileId) {
      throw new Error('PayTabs configuration missing');
    }

    const payload = {
      profile_id: input.profileId || this.profileId,
      tran_type: 'sale',
      tran_class: 'recurring',
      cart_id: input.cartId || `CART-${Date.now()}`,
      cart_currency: input.currency,
      cart_amount: input.amount.toFixed(2),
      token: input.token,
      customer_details: {
        email: input.customerEmail,
      },
    };

    try {
      const res = await fetch('https://secure.paytabs.sa/payment/request', {
        method: 'POST',
        headers: {
          authorization: this.serverKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        logger.error('[PayTabs] Request failed', { status: res.status, error: errorText });
        throw new Error(`PayTabs error: ${errorText}`);
      }

      const data = await res.json();
      
      return {
        tran_ref: data.tran_ref || '',
        status: data.payment_result?.response_status === 'A' ? 'SUCCESS' : 'FAILED',
        error_message: data.payment_result?.response_message,
        amount: input.amount,
        currency: input.currency,
      };
    } catch (error) {
      logger.error('[PayTabs] Charge failed', { error });
      return {
        tran_ref: '',
        status: 'FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        amount: input.amount,
        currency: input.currency,
      };
    }
  }
}

export const payTabsClient = new PayTabsClient();
