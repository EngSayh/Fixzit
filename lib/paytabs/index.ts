/**
 * PayTabs Integration - Public API
 * Canonical exports for PayTabs payment gateway
 * 
 * @module lib/paytabs
 */

// Re-export configuration
export {
  PAYTABS_CONFIG,
  PAYTABS_REGIONS,
  type PayTabsRegion,
} from './config';

// Re-export core gateway functions
export {
  paytabsBase,
  createHppRequest,
  createPaymentPage,
  verifyPayment,
  validateCallback,
  PAYMENT_METHODS,
  CURRENCIES,
  getAvailablePaymentMethods,
  type SimplePaymentRequest,
  type SimplePaymentResponse,
  type PaymentMethod,
} from './core';

// Re-export subscription business logic
export {
  normalizePayTabsPayload,
  finalizePayTabsTransaction,
  type NormalizedPayTabsPayload,
} from './subscription';
