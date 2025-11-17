"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailablePaymentMethods = exports.CURRENCIES = exports.PAYMENT_METHODS = void 0;
exports.paytabsBase = paytabsBase;
exports.createHppRequest = createHppRequest;
exports.createPaymentPage = createPaymentPage;
exports.verifyPayment = verifyPayment;
exports.validateCallback = validateCallback;
exports.createRefund = createRefund;
exports.queryRefundStatus = queryRefundStatus;
const crypto_1 = require("crypto");
const logger_1 = require("@/lib/logger");
const REGIONS = {
    KSA: 'https://secure.paytabs.sa', UAE: 'https://secure.paytabs.com',
    EGYPT: 'https://secure-egypt.paytabs.com', OMAN: 'https://secure-oman.paytabs.com',
    JORDAN: 'https://secure-jordan.paytabs.com', KUWAIT: 'https://secure-kuwait.paytabs.com',
    GLOBAL: 'https://secure-global.paytabs.com'
};
function paytabsBase(region = 'GLOBAL') { return REGIONS[region] || REGIONS.GLOBAL; }
async function createHppRequest(region, payload) {
    const r = await fetch(`${paytabsBase(region)}/payment/request`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'authorization': process.env.PAYTABS_SERVER_KEY
        },
        body: JSON.stringify(payload)
    });
    return r.json();
}
// PayTabs configuration - validation happens lazily at runtime
const PAYTABS_CONFIG = {
    profileId: process.env.PAYTABS_PROFILE_ID,
    serverKey: process.env.PAYTABS_SERVER_KEY,
    baseUrl: process.env.PAYTABS_BASE_URL || paytabsBase('GLOBAL')
};
/**
 * Validates that PayTabs credentials are configured
 * @throws Error if credentials are missing
 */
function validatePayTabsConfig() {
    if (!PAYTABS_CONFIG.profileId || !PAYTABS_CONFIG.serverKey) {
        throw new Error('PayTabs credentials not configured. Please set PAYTABS_PROFILE_ID and PAYTABS_SERVER_KEY environment variables. ' +
            'See documentation: https://docs.paytabs.com/setup');
    }
}
async function createPaymentPage(request) {
    // Validate credentials before making API call
    validatePayTabsConfig();
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
        }
        else {
            return {
                success: false,
                error: data.message || 'Payment initialization failed'
            };
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Payment gateway error';
        logger_1.logger.error('PayTabs error', { error });
        return {
            success: false,
            error: errorMessage
        };
    }
}
async function verifyPayment(tranRef) {
    // Validate credentials before making API call
    validatePayTabsConfig();
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
    }
    catch (error) {
        logger_1.logger.error('PayTabs verification error', { error });
        throw error;
    }
}
function validateCallback(payload, signature) {
    // Implement signature validation according to PayTabs documentation
    const calculatedSignature = generateSignature(payload);
    // Use timing-safe comparison to prevent timing attacks
    try {
        return (0, crypto_1.timingSafeEqual)(Buffer.from(calculatedSignature, 'hex'), Buffer.from(signature, 'hex'));
    }
    catch {
        // If buffers are different lengths, timingSafeEqual will throw
        return false;
    }
}
function generateSignature(payload) {
    // Ensure server key is configured
    if (!PAYTABS_CONFIG.serverKey) {
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
    const hmac = (0, crypto_1.createHmac)('sha256', PAYTABS_CONFIG.serverKey);
    hmac.update(canonicalString);
    return hmac.digest('hex');
}
// Payment methods supported in Saudi Arabia
exports.PAYMENT_METHODS = {
    MADA: 'mada',
    VISA: 'visa',
    MASTERCARD: 'mastercard',
    APPLE_PAY: 'applepay',
    STC_PAY: 'stcpay',
    TAMARA: 'tamara', // Buy Now Pay Later
    TABBY: 'tabby' // Buy Now Pay Later
};
// Currency codes
exports.CURRENCIES = {
    SAR: 'SAR', // Saudi Riyal
    USD: 'USD',
    EUR: 'EUR',
    AED: 'AED' // UAE Dirham
};
const getAvailablePaymentMethods = () => {
    return [
        {
            id: exports.PAYMENT_METHODS.MADA,
            name: 'mada',
            icon: '/icons/mada.svg',
            enabled: true
        },
        {
            id: exports.PAYMENT_METHODS.VISA,
            name: 'Visa',
            icon: '/icons/visa.svg',
            enabled: true
        },
        {
            id: exports.PAYMENT_METHODS.MASTERCARD,
            name: 'Mastercard',
            icon: '/icons/mastercard.svg',
            enabled: true
        },
        {
            id: exports.PAYMENT_METHODS.APPLE_PAY,
            name: 'Apple Pay',
            icon: '/icons/apple-pay.svg',
            enabled: true
        },
        {
            id: exports.PAYMENT_METHODS.STC_PAY,
            name: 'STC Pay',
            icon: '/icons/stc-pay.svg',
            enabled: true
        },
        {
            id: exports.PAYMENT_METHODS.TAMARA,
            name: 'Tamara - Buy Now Pay Later',
            icon: '/icons/tamara.svg',
            enabled: true
        }
    ];
};
exports.getAvailablePaymentMethods = getAvailablePaymentMethods;
/**
 * Create a refund for a previous transaction
 * @param request - Refund request parameters
 * @returns Refund response with status
 */
async function createRefund(request) {
    var _a, _b;
    validatePayTabsConfig();
    try {
        const payload = {
            profile_id: PAYTABS_CONFIG.profileId,
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
        logger_1.logger.info('[PayTabs] Creating refund', {
            refundId: request.refundId,
            originalTxn: request.originalTransactionId,
            amount: request.amount,
            currency: request.currency
        });
        const response = await fetch(`${PAYTABS_CONFIG.baseUrl}/payment/request`, {
            method: 'POST',
            headers: {
                'Authorization': PAYTABS_CONFIG.serverKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        logger_1.logger.info('[PayTabs] Refund response', { data });
        if (data.tran_ref) {
            const status = ((_a = data.payment_result) === null || _a === void 0 ? void 0 : _a.response_status) || 'P';
            const message = ((_b = data.payment_result) === null || _b === void 0 ? void 0 : _b.response_message) || 'Refund initiated';
            return {
                success: status === 'A' || status === 'P', // Approved or Pending
                refundId: data.tran_ref,
                status,
                message
            };
        }
        else {
            return {
                success: false,
                error: data.result || data.message || 'Refund failed'
            };
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Refund processing error';
        logger_1.logger.error('[PayTabs] Refund error', { error, request });
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
async function queryRefundStatus(tranRef) {
    validatePayTabsConfig();
    try {
        logger_1.logger.info('[PayTabs] Querying refund status', { tranRef });
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
        const data = await response.json();
        logger_1.logger.info('[PayTabs] Refund status response', { data });
        return data;
    }
    catch (error) {
        logger_1.logger.error('[PayTabs] Refund status query error', { error, tranRef });
        throw error;
    }
}
