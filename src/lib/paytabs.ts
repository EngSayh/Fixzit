// PayTabs Configuration
const PAYTABS_CONFIG = {
  profileId: process.env.PAYTABS_PROFILE_ID!,
  serverKey: process.env.PAYTABS_SERVER_KEY!,
  baseUrl: process.env.PAYTABS_BASE_URL || 'https://secure.paytabs.sa'
};

// PayTabs Regions
const REGIONS: Record<string,string> = {
  KSA: 'https://secure.paytabs.sa', 
  UAE: 'https://secure.paytabs.com',
  EGYPT:'https://secure-egypt.paytabs.com', 
  OMAN:'https://secure-oman.paytabs.com',
  JORDAN:'https://secure-jordan.paytabs.com', 
  KUWAIT:'https://secure-kuwait.paytabs.com',
  GLOBAL:'https://secure-global.paytabs.com'
};

export function paytabsBase(region='GLOBAL'){ return REGIONS[region] || REGIONS.GLOBAL; }

// Type definitions
export interface PaymentRequest {
  invoiceId?: string;
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
  callbackUrl: string;
  customerDetails: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  tokenize?: boolean;
}

export interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  error?: string;
}

export async function createHppRequest(region:string, payload:any) {
  const r = await fetch(`${paytabsBase(region)}/payment/request`, {
    method:'POST',
    headers: {
      'Content-Type':'application/json',
      'authorization': process.env.PAYTABS_SERVER_KEY!,
    },
    body: JSON.stringify(payload)
  });
  return r.json();
}

export async function createPaymentPage(request: PaymentRequest): Promise<PaymentResponse> {
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
        phone: request.customerDetails.phone || '',
        street1: request.customerDetails.address || '',
        city: request.customerDetails.city || '',
        state: request.customerDetails.state || '',
        country: request.customerDetails.country || 'SA',
        zip: request.customerDetails.zip || ''
      },
      
      // Hide shipping
      hide_shipping: true,
      
      // Language
      paypage_lang: 'ar',
      
      // Tokenization for recurring payments
      ...(request.tokenize && { tokenise: 2 })
    };

    const response = await fetch(`${PAYTABS_CONFIG.baseUrl}/payment/request`, {
      method: 'POST',
      headers: {
        'Authorization': PAYTABS_CONFIG.serverKey,
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
      };
    }
  } catch (error: any) {
    console.error('PayTabs error:', error);
    return {
      success: false,
      error: error.message || 'Payment gateway error'
    };
  }
}

export async function verifyPayment(tranRef: string): Promise<any> {
  try {
    const response = await fetch(`${PAYTABS_CONFIG.baseUrl}/payment/query`, {
      method: 'POST',
      headers: {
        'Authorization': PAYTABS_CONFIG.serverKey,
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

// Recurring payment function
export async function createRecurringPayment(token: string, amount: number, currency: string, description: string): Promise<any> {
  try {
    const payload = {
      profile_id: PAYTABS_CONFIG.profileId,
      tran_type: 'sale',
      tran_class: 'recurring',
      cart_id: `REC-${Date.now()}`,
      cart_currency: currency,
      cart_amount: amount.toFixed(2),
      cart_description: description,
      token: token
    };

    const response = await fetch(`${PAYTABS_CONFIG.baseUrl}/payment/request`, {
      method: 'POST',
      headers: {
        'Authorization': PAYTABS_CONFIG.serverKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return await response.json();
  } catch (error) {
    console.error('PayTabs recurring payment error:', error);
    throw error;
  }
}

export function validateCallback(payload: any, signature: string): boolean {
  // Implement signature validation according to PayTabs documentation
  // This is a simplified version - refer to PayTabs docs for actual implementation
  const calculatedSignature = generateSignature(payload);
  return calculatedSignature === signature;
}

function generateSignature(payload: any): string {
  // Implement according to PayTabs signature generation algorithm
  // This is a placeholder - actual implementation depends on PayTabs docs
  return '';
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
};

// Currency codes
export const CURRENCIES = {
  SAR: 'SAR', // Saudi Riyal
  USD: 'USD',
  EUR: 'EUR',
  AED: 'AED'  // UAE Dirham
};

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
