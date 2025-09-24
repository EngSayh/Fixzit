const REGIONS: Record<string,string> = {
  KSA: 'https://secure.paytabs.sa', UAE: 'https://secure.paytabs.com',
  EGYPT:'https://secure-egypt.paytabs.com', OMAN:'https://secure-oman.paytabs.com',
  JORDAN:'https://secure-jordan.paytabs.com', KUWAIT:'https://secure-kuwait.paytabs.com',
  GLOBAL:'https://secure-global.paytabs.com'
};

export function paytabsBase(region='GLOBAL'){ return REGIONS[region] || REGIONS.GLOBAL; }

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

/**
 * Verify a PayTabs transaction by reference.
 *
 * Sends a POST request to the PayTabs /payment/query endpoint using configured profile credentials
 * and returns the parsed JSON response from PayTabs.
 *
 * @param tranRef - The PayTabs transaction reference (tran_ref) to verify.
 * @returns The parsed JSON response from the PayTabs verification endpoint.
 * @throws Re-throws any network or fetch errors that occur while calling the API.
 */
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

/**
 * Verifies a PayTabs callback payload by computing an HMAC-SHA256 of the raw body and comparing it to the provided signature header.
 *
 * Uses the server key from PAYTABS_API_SERVER_KEY or PAYTABS_SERVER_KEY environment variables. Comparison is performed in constant time to mitigate timing attacks.
 *
 * @param rawBody - Raw callback request body (exact bytes used to compute the HMAC)
 * @param signatureHeader - Hex-encoded HMAC-SHA256 signature from the callback headers
 * @returns True if the computed signature matches `signatureHeader`; false if the keys are missing, the signatures differ, or an error occurs during verification
 */
export async function validateCallbackRaw(rawBody: string, signatureHeader: string | null | undefined): Promise<boolean> {
  const serverKey = process.env.PAYTABS_API_SERVER_KEY || process.env.PAYTABS_SERVER_KEY;
  if (!serverKey || !signatureHeader) return false;
  try {
    const enc = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      enc.encode(serverKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
    const bytes = new Uint8Array(sig);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      const h = bytes[i].toString(16).padStart(2, '0');
      hex += h;
    }
    // constant-time compare
    if (hex.length !== signatureHeader.length) return false;
    let diff = 0;
    for (let i = 0; i < hex.length; i++) {
      diff |= hex.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
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
