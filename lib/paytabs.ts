import crypto from 'crypto';
import { PAYTABS_CONFIG, PAYTABS_REGIONS, type PayTabsRegion } from './paytabs/config';

export function paytabsBase(region: PayTabsRegion = 'GLOBAL') {
  return PAYTABS_REGIONS[region] || PAYTABS_REGIONS.GLOBAL;
}

export async function createHppRequest(region: PayTabsRegion, payload: Record<string, unknown>) {
  try {
    const r = await fetch(`${paytabsBase(region)}/payment/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAYTABS_CONFIG.serverKey}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!r.ok) {
      throw new Error(`PayTabs request failed: ${r.status} ${r.statusText}`);
    }
    
    return r.json();
  } catch (error) {
    console.error('PayTabs createHppRequest error:', error);
    throw error;
  }
}

export type SimplePaymentRequest = {
  amount: number;
  currency: string;
  customerDetails: {
    name: string; email: string; phone: string; address: string; city: string; state: string; country: string; zip: string;
  };
  description: string;
  invoiceId?: string;
  returnUrl: string;
  callbackUrl: string;
}

export type SimplePaymentResponse = { success: true; paymentUrl: string; transactionId: string } | { success: false; error: string };

export async function createPaymentPage(request: SimplePaymentRequest): Promise<SimplePaymentResponse> {
  try {
    const payload = {
      profile_id: PAYTABS_CONFIG.profileId,
      tran_type: 'sale',
      tran_class: 'ecom',
      cart_id: request.invoiceId || `CART-${Date.now()}`,
      cart_currency: request.currency,
      cart_amount: request.amount.toFixed(2),
      cart_description: request.description,
      
      // URLs
      return: request.returnUrl,
      callback: request.callbackUrl,
      
      // Customer details
      customer_details: {
        name: request.customerDetails.name,
        email: request.customerDetails.email,
        phone: request.customerDetails.phone,
        street1: request.customerDetails.address,
        city: request.customerDetails.city,
        state: request.customerDetails.state,
        country: request.customerDetails.country,
        zip: request.customerDetails.zip
      },
      
      // Hide shipping
      hide_shipping: true,
      
      // Language
      paypage_lang: 'ar'
    };

    const response = await fetch(`${PAYTABS_CONFIG.baseUrl}/payment/request`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYTABS_CONFIG.serverKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.redirect_url) {
      return {
        success: true,
        paymentUrl: data.redirect_url,
        transactionId: data.tran_ref
      };
    } else {
      return {
        success: false,
        error: data.message || 'Payment initialization failed'
      } as const;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Payment gateway error';
    console.error('PayTabs error:', error);
    return {
      success: false,
      error: errorMessage
    } as const;
  }
}

export async function verifyPayment(tranRef: string): Promise<unknown> {
  try {
    const response = await fetch(`${PAYTABS_CONFIG.baseUrl}/payment/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYTABS_CONFIG.serverKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        profile_id: PAYTABS_CONFIG.profileId,
        tran_ref: tranRef
      })
    });

    return await response.json();
  } catch (error) {
    console.error('PayTabs verification error:', error);
    throw error;
  }
}

export function validateCallback(payload: Record<string, unknown>, signature: string): boolean {
  // Implement signature validation according to PayTabs documentation
  const calculatedSignature = generateSignature(payload);
  
  if (!calculatedSignature || !signature) {
    return false;
  }
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    // If buffers are different lengths, timingSafeEqual throws
    return false;
  }
}

function generateSignature(payload: Record<string, unknown>): string {
  // Implement according to PayTabs signature generation algorithm
  const serverKey = PAYTABS_CONFIG.serverKey;
  
  if (!serverKey) {
    console.error('PayTabs server key is not configured');
    return '';
  }
  
  // Sort keys and create canonical string as per PayTabs documentation
  const sortedKeys = Object.keys(payload).sort();
  const canonicalString = sortedKeys
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(payload[key]))}`)
    .join('&');
  
  // Generate HMAC-SHA256 signature
  const hmac = crypto.createHmac('sha256', serverKey);
  hmac.update(canonicalString);
  
  // Return the signature in hex format (adjust to base64 if PayTabs requires it)
  return hmac.digest('hex');
}

// Payment methods supported in Saudi Arabia
export const PAYMENT_METHODS = {
  MADA: 'mada',
  VISA: 'visa',
  MASTERCARD: 'mastercard',
  APPLE_PAY: 'applepay',
  STC_PAY: 'stcpay',
  TAMARA: 'tamara', // Buy Now Pay Later
  TABBY: 'tabby'    // Buy Now Pay Later
} as const;

// Currency codes
export const CURRENCIES = {
  SAR: 'SAR', // Saudi Riyal
  USD: 'USD',
  EUR: 'EUR',
  AED: 'AED'  // UAE Dirham
} as const;

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
}

export const getAvailablePaymentMethods = (): PaymentMethod[] => {
  return [
    {
      id: PAYMENT_METHODS.MADA,
      name: 'mada',
      icon: '/icons/mada.svg',
      enabled: true
    },
    {
      id: PAYMENT_METHODS.VISA,
      name: 'Visa',
      icon: '/icons/visa.svg',
      enabled: true
    },
    {
      id: PAYMENT_METHODS.MASTERCARD,
      name: 'Mastercard',
      icon: '/icons/mastercard.svg',
      enabled: true
    },
    {
      id: PAYMENT_METHODS.APPLE_PAY,
      name: 'Apple Pay',
      icon: '/icons/apple-pay.svg',
      enabled: true
    },
    {
      id: PAYMENT_METHODS.STC_PAY,
      name: 'STC Pay',
      icon: '/icons/stc-pay.svg',
      enabled: true
    },
    {
      id: PAYMENT_METHODS.TAMARA,
      name: 'Tamara - Buy Now Pay Later',
      icon: '/icons/tamara.svg',
      enabled: true
    }
  ];
};
