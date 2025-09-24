import { config } from '@/src/config/environment';

interface PayTabsConfig {
  profileId: string;
  serverKey: string;
  clientKey: string;
  region: string;
  baseUrl: string;
}

interface PaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  customerDetails: {
    name: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      country: string;
      zip: string;
    };
  };
  callbackUrl: string;
  returnUrl: string;
}

interface PaymentResponse {
  redirect_url: string;
  tran_ref: string;
  payment_result?: {
    response_status: string;
    response_code: string;
    response_message: string;
    transaction_time: string;
  };
}

class PayTabsClient {
  private config: PayTabsConfig;

  constructor() {
    this.config = {
      profileId: config.paytabs.profileId,
      serverKey: config.paytabs.serverKey,
      clientKey: config.paytabs.clientKey,
      region: config.paytabs.region,
      baseUrl: config.paytabs.region === 'SAU' 
        ? 'https://secure.paytabs.sa' 
        : 'https://secure.paytabs.com'
    };
  }

  /**
   * Create a payment page
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const endpoint = `${this.config.baseUrl}/payment/request`;

    const payload = {
      profile_id: this.config.profileId,
      tran_type: 'sale',
      tran_class: 'ecom',
      cart_id: request.orderId,
      cart_currency: request.currency,
      cart_amount: request.amount,
      cart_description: `Order #${request.orderId}`,
      paypage_lang: 'ar', // Arabic for Saudi Arabia
      customer_details: {
        name: request.customerDetails.name,
        email: request.customerDetails.email,
        phone: request.customerDetails.phone,
        street1: request.customerDetails.address.street,
        city: request.customerDetails.address.city,
        country: 'SA',
        zip: request.customerDetails.address.zip
      },
      shipping_details: {
        name: request.customerDetails.name,
        email: request.customerDetails.email,
        phone: request.customerDetails.phone,
        street1: request.customerDetails.address.street,
        city: request.customerDetails.address.city,
        country: 'SA',
        zip: request.customerDetails.address.zip
      },
      callback: request.callbackUrl,
      return: request.returnUrl,
      hide_shipping: true,
      framed: false
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'authorization': this.config.serverKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`PayTabs API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.redirect_url) {
        throw new Error(data.message || 'Failed to create payment page');
      }

      return data;
    } catch (error) {
      console.error('PayTabs payment creation error:', error);
      throw error;
    }
  }

  /**
   * Verify payment callback
   */
  async verifyCallback(tranRef: string, signature: string): Promise<boolean> {
    // Verify the signature to ensure the callback is from PayTabs
    const expectedSignature = this.generateSignature(tranRef);
    return signature === expectedSignature;
  }

  /**
   * Query transaction status
   */
  async queryTransaction(tranRef: string): Promise<any> {
    const endpoint = `${this.config.baseUrl}/payment/query`;

    const payload = {
      profile_id: this.config.profileId,
      tran_ref: tranRef
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'authorization': this.config.serverKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`PayTabs API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('PayTabs query error:', error);
      throw error;
    }
  }

  /**
   * Refund a transaction
   */
  async refundTransaction(tranRef: string, amount: number, reason: string): Promise<any> {
    const endpoint = `${this.config.baseUrl}/payment/request`;

    const payload = {
      profile_id: this.config.profileId,
      tran_type: 'refund',
      tran_class: 'ecom',
      tran_ref: tranRef,
      cart_currency: 'SAR',
      cart_amount: amount,
      cart_description: `Refund: ${reason}`
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'authorization': this.config.serverKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`PayTabs API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('PayTabs refund error:', error);
      throw error;
    }
  }

  /**
   * Generate signature for verification
   */
  private generateSignature(data: string): string {
    const crypto = require('crypto');
    const key = this.config.serverKey;
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }
}

// Export singleton instance
export const paytabs = new PayTabsClient();

// Export convenience functions
export const createPaymentPage = (request: PaymentRequest) => paytabs.createPayment(request);
export const createHppRequest = createPaymentPage; // Alias for backwards compatibility
export const validateCallback = (tranRef: string, signature: string) => paytabs.verifyCallback(tranRef, signature);
export const verifyPayment = (tranRef: string) => paytabs.queryTransaction(tranRef);

// Export types
export type { PaymentRequest, PaymentResponse };