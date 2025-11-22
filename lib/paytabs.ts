import { createHmac, timingSafeEqual } from 'crypto';
import { logger } from './logger';
import { fetchWithRetry } from '@/lib/http/fetchWithRetry';
import { SERVICE_RESILIENCE } from '@/config/service-timeouts';
import { getCircuitBreaker } from '@/lib/resilience';

const REGIONS: Record<string,string> = {
  KSA: 'https://secure.paytabs.sa', UAE: 'https://secure.paytabs.com',
  EGYPT:'https://secure-egypt.paytabs.com', OMAN:'https://secure-oman.paytabs.com',
  JORDAN:'https://secure-jordan.paytabs.com', KUWAIT:'https://secure-kuwait.paytabs.com',
  GLOBAL:'https://secure-global.paytabs.com'
};

export function paytabsBase(region='GLOBAL'){ return REGIONS[region] || REGIONS.GLOBAL; }

export async function createHppRequest(region:string, payload:Record<string, unknown>) {
  const authHeader = process.env.PAYTABS_SERVER_KEY || process.env.PAYTABS_API_SERVER_KEY || '';
  const response = await fetchWithRetry(`${paytabsBase(region)}/payment/request`, {
    method:'POST',
    headers: {
      'Content-Type':'application/json',
      'authorization': authHeader},
    body: JSON.stringify(payload)
  }, {
    timeoutMs: paytabsResilience.timeouts.paymentMs,
    maxAttempts: paytabsResilience.retries.maxAttempts,
    retryDelayMs: paytabsResilience.retries.baseDelayMs,
    circuitBreaker: paytabsBreaker,
    label: 'paytabs-hpp',
  });
  return response.json();
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
};

export type SimplePaymentResponse = { success: true; paymentUrl: string; transactionId: string } | { success: false; error: string };

const paytabsResilience = SERVICE_RESILIENCE.paytabs;
const paytabsBreaker = getCircuitBreaker('paytabs');

type PaytabsOverride = { profileId?: string; serverKey?: string; baseUrl?: string };

const getPaytabsConfig = () => {
  const override = (globalThis as { PAYTABS_CONFIG?: PaytabsOverride }).PAYTABS_CONFIG;

  if (override) {
    return {
      profileId: override.profileId,
      serverKey: override.serverKey,
      baseUrl: override.baseUrl || paytabsBase('GLOBAL'),
    };
  }

  return {
    profileId: process.env.PAYTABS_PROFILE_ID,
    serverKey: process.env.PAYTABS_SERVER_KEY || process.env.PAYTABS_API_SERVER_KEY,
    baseUrl: process.env.PAYTABS_BASE_URL || paytabsBase('GLOBAL'),
  };
};

/**
 * Validates that PayTabs credentials are configured
 * @throws Error if credentials are missing
 */
function validatePayTabsConfig(): void {
  const config = getPaytabsConfig();
  if (!config.profileId || !config.serverKey) {
    throw new Error(
      'PayTabs credentials not configured. Please set PAYTABS_PROFILE_ID and PAYTABS_SERVER_KEY environment variables. ' +
      'See documentation: https://docs.paytabs.com/setup'
    );
  }
}

type PaytabsPaymentResponse = {
  redirect_url?: string;
  tran_ref?: string;
  message?: string;
  [key: string]: unknown;
};

export async function createPaymentPage(request: SimplePaymentRequest): Promise<SimplePaymentResponse> {
  // Validate credentials before making API call
  validatePayTabsConfig();
  const config = getPaytabsConfig();
  
  try {
    const cartAmount = (Math.round(request.amount * 100) / 100).toFixed(2);
    const payload = {
      profile_id: config.profileId,
      tran_type: 'sale',
      tran_class: 'ecom',
      cart_id: request.invoiceId || `CART-${Date.now()}`,
      cart_currency: request.currency,
      cart_amount: cartAmount,
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

    const response = await fetchWithRetry(`${config.baseUrl}/payment/request`, {
      method: 'POST',
      headers: {
        'Authorization': config.serverKey!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }, {
      timeoutMs: paytabsResilience.timeouts.paymentMs,
      maxAttempts: paytabsResilience.retries.maxAttempts,
      retryDelayMs: paytabsResilience.retries.baseDelayMs,
      circuitBreaker: paytabsBreaker,
      label: 'paytabs-payment-create',
    });

    const data = (await response.json()) as PaytabsPaymentResponse;

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
  } catch (_error: unknown) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    const errorMessage = error instanceof Error ? error.message : 'Payment gateway error';
    logger.error('PayTabs error', { error });
    return {
      success: false,
      error: errorMessage
    } as const;
  }
}

type PaytabsVerifyResponse = Record<string, unknown>;

export async function verifyPayment(tranRef: string): Promise<PaytabsVerifyResponse> {
  // Validate credentials before making API call
  validatePayTabsConfig();
  const config = getPaytabsConfig();
  
  try {
    const response = await fetchWithRetry(`${config.baseUrl}/payment/query`, {
      method: 'POST',
      headers: {
        'Authorization': config.serverKey!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        profile_id: config.profileId,
        tran_ref: tranRef
      })
    }, {
      timeoutMs: paytabsResilience.timeouts.verifyMs,
      maxAttempts: paytabsResilience.retries.maxAttempts,
      retryDelayMs: paytabsResilience.retries.baseDelayMs,
      circuitBreaker: paytabsBreaker,
      label: 'paytabs-verify',
    });

    return (await response.json()) as PaytabsVerifyResponse;
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error('PayTabs verification error', { error });
    throw error;
  }
}

export function validateCallback(payload: Record<string, unknown>, signature: string): boolean {
  const config = getPaytabsConfig();
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  if (!config.serverKey) {
    logger.warn('PayTabs server key missing - skipping signature validation in development');
    return true;
  }

  // SECURITY: Reject missing signatures (fail closed)
  if (!signature) {
    logger.error('PayTabs callback signature missing - rejecting callback');
    return false;
  }

  // Implement signature validation according to PayTabs documentation
  const calculatedSignature = generateSignature(payload, config.serverKey);
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(calculatedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    // If buffers are different lengths, timingSafeEqual will throw
    return false;
  }
}

export async function validateCallbackRaw(payload: unknown, signature?: string | null): Promise<boolean> {
  const config = getPaytabsConfig();
  const serverKey = config.serverKey;

  if (!serverKey || !signature) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(serverKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const digest = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data ?? '')));
    const computed = Buffer.from(digest).toString('hex');
    return timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(String(signature), 'hex'));
  } catch (error) {
    logger.error('PayTabs raw callback validation error', { error });
    return false;
  }
}

function generateSignature(payload: Record<string, unknown>, serverKey?: string): string {
  // Ensure server key is configured
  if (!serverKey) {
    throw new Error('PayTabs server key is required for signature generation');
  }

  // Canonically serialize payload according to PayTabs specification:
  // 1. Sort keys alphabetically
  // 2. Exclude 'signature' field itself if present
  // 3. Flatten nested objects (if any) before serialization
  // 4. Join as key=value pairs with & delimiter
  const sortedKeys = Object.keys(payload)
    .filter(key => key !== 'signature') // Exclude signature field itself
    .sort();
    
  const canonicalString = sortedKeys
    .map(key => {
      const value = payload[key];
      // Convert to string, handling null/undefined
      const stringValue = value != null ? String(value) : '';
      return `${key}=${stringValue}`;
    })
    .join('&');

  // Compute HMAC-SHA256 hex digest using the server key
  const hmac = createHmac('sha256', serverKey);
  hmac.update(canonicalString);
  return hmac.digest('hex');
}

/**
 * Generate a PayTabs callback signature for a given payload.
 * Useful for local testing utilities and the signing script.
 */
export function generateCallbackSignature(payload: Record<string, unknown>): string {
  const config = getPaytabsConfig();
  return generateSignature(payload, config.serverKey);
}

export interface PaytabsPayoutRequest {
  amount: number;
  currency: string;
  reference: string;
  description?: string;
  beneficiary: {
    name: string;
    iban: string;
    bank?: string;
    accountNumber?: string;
  };
  metadata?: Record<string, unknown>;
}

export type PaytabsPayoutResult =
  | { success: true; payoutId: string; status?: string }
  | { success: false; error: string };

export async function createPayout(input: PaytabsPayoutRequest): Promise<PaytabsPayoutResult> {
  validatePayTabsConfig();
  const config = getPaytabsConfig();

  const payload = {
    profile_id: config.profileId,
    payout_reference: input.reference,
    payout_amount: input.amount.toFixed(2),
    payout_currency: input.currency,
    payout_description: input.description ?? 'Fixzit payout',
    beneficiary: {
      name: input.beneficiary.name,
      iban: input.beneficiary.iban,
      bank: input.beneficiary.bank,
      account_number: input.beneficiary.accountNumber,
    },
    metadata: input.metadata,
  };

  try {
    const response = await fetchWithRetry(`${config.baseUrl}/payment/payouts`, {
      method: 'POST',
      headers: {
        Authorization: config.serverKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }, {
      timeoutMs: paytabsResilience.timeouts.payoutMs,
      maxAttempts: paytabsResilience.retries.maxAttempts,
      retryDelayMs: paytabsResilience.retries.baseDelayMs,
      circuitBreaker: paytabsBreaker,
      label: 'paytabs-payout',
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data?.message || response.statusText || 'Payout request failed';
      return { success: false, error: errorMessage };
    }

    return {
      success: true,
      payoutId: data?.payout_id ?? input.reference,
      status: data?.payout_status,
    };
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error('PayTabs payout error', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PayTabs payout error',
    };
  }
}

export async function queryPayoutStatus(payoutId: string): Promise<Record<string, unknown>> {
  validatePayTabsConfig();
  const config = getPaytabsConfig();

  const response = await fetchWithRetry(`${config.baseUrl}/payment/payouts/query`, {
    method: 'POST',
    headers: {
      Authorization: config.serverKey!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      profile_id: config.profileId,
      payout_id: payoutId,
    }),
  }, {
    timeoutMs: paytabsResilience.timeouts.payoutMs,
    maxAttempts: paytabsResilience.retries.maxAttempts,
    retryDelayMs: paytabsResilience.retries.baseDelayMs,
    circuitBreaker: paytabsBreaker,
    label: 'paytabs-payout-status',
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.message || response.statusText || 'Failed to query payout';
    throw new Error(message);
  }

  return data as Record<string, unknown>;
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

/**
 * Refund Request Parameters
 */
export interface RefundRequest {
  /** Original transaction reference from PayTabs */
  originalTransactionId: string;
  /** Unique refund identifier for tracking */
  refundId: string;
  /** Amount to refund in major currency units (e.g., SAR not halalas) */
  amount: number;
  /** Currency code (SAR, AED, etc.) */
  currency: string;
  /** Reason for refund */
  reason?: string;
  /** Additional metadata for tracking */
  metadata?: Record<string, unknown>;
}

/**
 * Refund Response
 */
export interface RefundResponse {
  /** Whether the refund was successful */
  success: boolean;
  /** PayTabs refund transaction reference */
  refundId?: string;
  /** Refund status: A = Approved, P = Pending, D = Declined */
  status?: string;
  /** Human-readable message */
  message?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Refund Status Query Response
 */
export interface RefundStatusResponse {
  /** Transaction reference */
  tran_ref: string;
  /** Payment result details */
  payment_result: {
    /** Response status: A = Approved, D = Declined, P = Pending */
    response_status: string;
    /** Numeric response code */
    response_code: string;
    /** Human-readable message */
    response_message: string;
  };
  /** Cart/Order ID */
  cart_id: string;
  /** Refund amount */
  cart_amount: string;
  /** Currency code */
  cart_currency: string;
  /** Transaction type */
  tran_type: string;
}

/**
 * Create a refund for a previous transaction
 * @param request - Refund request parameters
 * @returns Refund response with status
 */
export async function createRefund(request: RefundRequest): Promise<RefundResponse> {
  validatePayTabsConfig();
  const config = getPaytabsConfig();
  
  try {
    const payload = {
      profile_id: config.profileId,
      tran_ref: request.originalTransactionId,
      tran_type: 'refund',
      tran_class: 'ecom',
      cart_id: request.refundId,
      cart_currency: request.currency,
      cart_amount: request.amount.toFixed(2),
      cart_description: request.reason || 'Refund',
      // Include metadata if provided
      ...(request.metadata && Object.keys(request.metadata).length > 0 ? {
        udf1: JSON.stringify(request.metadata)
      } : {})
    };

    logger.info('[PayTabs] Creating refund', {
      refundId: request.refundId,
      originalTxn: request.originalTransactionId,
      amount: request.amount,
      currency: request.currency
    });

    const response = await fetchWithRetry(`${config.baseUrl}/payment/request`, {
      method: 'POST',
      headers: {
        'Authorization': config.serverKey!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }, {
      timeoutMs: paytabsResilience.timeouts.refundMs,
      maxAttempts: paytabsResilience.retries.maxAttempts,
      retryDelayMs: paytabsResilience.retries.baseDelayMs,
      circuitBreaker: paytabsBreaker,
      label: 'paytabs-refund',
    });

    const data = await response.json();

    logger.info('[PayTabs] Refund response', { data });

    if (data.tran_ref) {
      const status = data.payment_result?.response_status || 'P';
      const message = data.payment_result?.response_message || 'Refund initiated';
      
      return {
        success: status === 'A' || status === 'P', // Approved or Pending
        refundId: data.tran_ref,
        status,
        message
      };
    } else {
      return {
        success: false,
        error: data.result || data.message || 'Refund failed'
      };
    }
  } catch (_error: unknown) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    const errorMessage = error instanceof Error ? error.message : 'Refund processing error';
    logger.error('[PayTabs] Refund error', { error, request });
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Query the status of a refund transaction
 * @param tranRef - Transaction reference from PayTabs
 * @returns Refund status details
 */
export async function queryRefundStatus(tranRef: string): Promise<RefundStatusResponse> {
  validatePayTabsConfig();
  const config = getPaytabsConfig();
  
  try {
    logger.info('[PayTabs] Querying refund status', { tranRef });

    const response = await fetchWithRetry(`${config.baseUrl}/payment/query`, {
      method: 'POST',
      headers: {
        'Authorization': config.serverKey!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        profile_id: config.profileId,
        tran_ref: tranRef
      })
    }, {
      timeoutMs: paytabsResilience.timeouts.refundMs,
      maxAttempts: paytabsResilience.retries.maxAttempts,
      retryDelayMs: paytabsResilience.retries.baseDelayMs,
      circuitBreaker: paytabsBreaker,
      label: 'paytabs-refund-status',
    });

    const data = await response.json();
    
    logger.info('[PayTabs] Refund status response', { data });

    return data;
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error('[PayTabs] Refund status query error', { error, tranRef });
    throw error;
  }
}
