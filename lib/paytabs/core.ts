/**
 * PayTabs Core Gateway Integration
 * Canonical location for PayTabs payment gateway primitives
 * 
 * Functions: createPaymentPage, verifyPayment, validateCallback, createHppRequest
 * 
 * @module lib/paytabs/core
 */

import { PAYTABS_CONFIG, PAYTABS_REGIONS, type PayTabsRegion } from './config';

// ============================================================================
// REGION & BASE URL
// ============================================================================

/**
 * Get PayTabs base URL for a specific region
 */
export function paytabsBase(region: PayTabsRegion | string = 'GLOBAL'): string {
  return PAYTABS_REGIONS[region as PayTabsRegion] || PAYTABS_REGIONS.GLOBAL;
}

// ============================================================================
// HPP (Hosted Payment Page) REQUEST
// ============================================================================

/**
 * Create HPP request to PayTabs
 * Low-level gateway call
 */
export async function createHppRequest(region: string, payload: unknown) {
  const response = await fetch(`${paytabsBase(region)}/payment/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'authorization': process.env.PAYTABS_SERVER_KEY!},
    body: JSON.stringify(payload)});
  return response.json();
}

// ============================================================================
// TYPES
// ============================================================================

export type SimplePaymentRequest = {
  amount: number;
  currency: string;
  customerDetails: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    zip: string;
  };
  description: string;
  invoiceId?: string;
  returnUrl: string;
  callbackUrl: string;
};

export type SimplePaymentResponse =
  | { success: true; paymentUrl: string; transactionId: string }
  | { success: false; error: string };

// ============================================================================
// CREATE PAYMENT PAGE
// ============================================================================

/**
 * Create a payment page for customer checkout
 * 
 * @param request Payment request details
 * @returns Payment URL and transaction ID on success
 */
export async function createPaymentPage(
  request: SimplePaymentRequest
): Promise<SimplePaymentResponse> {
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
        zip: request.customerDetails.zip},

      // Hide shipping
      hide_shipping: true,

      // Language (default to Arabic for KSA)
      paypage_lang: 'ar'};

    const response = await fetch(`${PAYTABS_CONFIG.baseUrl}/payment/request`, {
      method: 'POST',
      headers: {
        Authorization: PAYTABS_CONFIG.serverKey,
        'Content-Type': 'application/json'},
      body: JSON.stringify(payload)});

    const data = await response.json();

    if (data.redirect_url) {
      return {
        success: true,
        paymentUrl: data.redirect_url,
        transactionId: data.tran_ref};
    } else {
      return {
        success: false,
        error: data.message || 'Payment initialization failed'} as const;
    }
  } catch (error: unknown) {
    console.error('PayTabs error:', error);
    return {
      success: false,
      error: (error as Error).message || 'Payment gateway error'} as const;
  }
}

// ============================================================================
// VERIFY PAYMENT
// ============================================================================

/**
 * Verify a payment transaction with PayTabs
 * 
 * @param tranRef Transaction reference from PayTabs
 * @returns Transaction verification data
 */
export async function verifyPayment(tranRef: string): Promise<unknown> {
  try {
    const response = await fetch(`${PAYTABS_CONFIG.baseUrl}/payment/query`, {
      method: 'POST',
      headers: {
        Authorization: PAYTABS_CONFIG.serverKey,
        'Content-Type': 'application/json'},
      body: JSON.stringify({
        profile_id: PAYTABS_CONFIG.profileId,
        tran_ref: tranRef})});

    return await response.json();
  } catch (error) {
    console.error('PayTabs verification error:', error);
    throw error;
  }
}

// ============================================================================
// CALLBACK VALIDATION
// ============================================================================

/**
 * Validate PayTabs callback signature
 * 
 * @param payload Callback payload from PayTabs
 * @param signature Signature to validate
 * @returns true if signature is valid
 */
export function validateCallback(payload: unknown, signature: string): boolean {
  const calculatedSignature = generateSignature(payload);
  return calculatedSignature === signature;
}

/**
 * Generate signature for PayTabs callback validation
 * 
 * @param payload Payload to sign
 * @returns Generated signature
 */
function generateSignature(_payload: unknown): string {
  // Placeholder - implement according to PayTabs signature algorithm
  // Refer to PayTabs documentation for actual implementation
  return '';
}

// ============================================================================
// PAYMENT METHODS & CONSTANTS
// ============================================================================

/** Payment methods supported in Saudi Arabia */
export const PAYMENT_METHODS = {
  MADA: 'mada',
  VISA: 'visa',
  MASTERCARD: 'mastercard',
  APPLE_PAY: 'applepay',
  STC_PAY: 'stcpay',
  TAMARA: 'tamara', // Buy Now Pay Later
  TABBY: 'tabby', // Buy Now Pay Later
} as const;

/** Currency codes */
export const CURRENCIES = {
  SAR: 'SAR', // Saudi Riyal
  USD: 'USD',
  EUR: 'EUR',
  AED: 'AED', // UAE Dirham
} as const;

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
}

/**
 * Get list of available payment methods
 * 
 * @returns Array of payment methods with metadata
 */
export const getAvailablePaymentMethods = (): PaymentMethod[] => {
  return [
    {
      id: PAYMENT_METHODS.MADA,
      name: 'mada',
      icon: '/icons/mada.svg',
      enabled: true},
    {
      id: PAYMENT_METHODS.VISA,
      name: 'Visa',
      icon: '/icons/visa.svg',
      enabled: true},
    {
      id: PAYMENT_METHODS.MASTERCARD,
      name: 'Mastercard',
      icon: '/icons/mastercard.svg',
      enabled: true},
    {
      id: PAYMENT_METHODS.APPLE_PAY,
      name: 'Apple Pay',
      icon: '/icons/apple-pay.svg',
      enabled: true},
    {
      id: PAYMENT_METHODS.STC_PAY,
      name: 'STC Pay',
      icon: '/icons/stc-pay.svg',
      enabled: true},
    {
      id: PAYMENT_METHODS.TAMARA,
      name: 'Tamara - Buy Now Pay Later',
      icon: '/icons/tamara.svg',
      enabled: true},
  ];
};
