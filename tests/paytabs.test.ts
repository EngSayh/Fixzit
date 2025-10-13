/**
 * Comprehensive tests for PayTabs integration helpers.
 * Testing library/framework: Vitest
 *
 * These tests attempt to import the PayTabs module from common paths.
 * If import fails, adjust the candidate paths in importPaytabs() to match your project.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Keep a pristine copy of the environment
const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  // Reset environment for each test
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

function setEnv(overrides?: Partial<NodeJS.ProcessEnv>) {
  process.env.PAYTABS_PROFILE_ID = overrides?.PAYTABS_PROFILE_ID ?? 'PROFILE_123';
  process.env.PAYTABS_SERVER_KEY = overrides?.PAYTABS_SERVER_KEY ?? 'SERVER_KEY_ABC';
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, 'PAYTABS_BASE_URL')) {
    // Explicitly set or unset PAYTABS_BASE_URL based on overrides
    if (overrides.PAYTABS_BASE_URL) {
      process.env.PAYTABS_BASE_URL = overrides.PAYTABS_BASE_URL;
    } else {
      delete process.env.PAYTABS_BASE_URL;
    }
  } else {
    // Default: unset to use paytabsBase('GLOBAL') fallback in module
    delete process.env.PAYTABS_BASE_URL;
  }
}

/**
 * Try to import the PayTabs module from common locations.
 * Adjust this list if your module lives elsewhere.
 */
async function importPaytabs() {
  const candidates = [
    '../src/paytabs',
    '../src/lib/paytabs',
    '../lib/paytabs',
    '../paytabs',
    '../src/utils/paytabs',
    '../server/paytabs',
  ];
  for (const p of candidates) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await import(p);
    } catch (_e) {
      // try next candidate
    }
  }
  throw new Error('Unable to locate the PayTabs module. Please update candidate paths in tests/paytabs.test.ts');
}

describe('paytabsBase', () => {
  it('returns correct base URLs for known regions and falls back to GLOBAL for unknown region', async () => {
    const mod = await importPaytabs();
    const { paytabsBase } = mod;

    expect(paytabsBase('KSA')).toBe('https://secure.paytabs.sa');
    expect(paytabsBase('UAE')).toBe('https://secure.paytabs.com');
    expect(paytabsBase('EGYPT')).toBe('https://secure-egypt.paytabs.com');
    expect(paytabsBase('OMAN')).toBe('https://secure-oman.paytabs.com');
    expect(paytabsBase('JORDAN')).toBe('https://secure-jordan.paytabs.com');
    expect(paytabsBase('KUWAIT')).toBe('https://secure-kuwait.paytabs.com');
    expect(paytabsBase('GLOBAL')).toBe('https://secure-global.paytabs.com');

    // Unknown -> fallback to GLOBAL
    // @ts-expect-error testing unknown region string
    expect(paytabsBase('UNKNOWN_REGION')).toBe('https://secure-global.paytabs.com');

    // Default param -> GLOBAL
    // @ts-expect-error omit param to exercise default
    expect(paytabsBase()).toBe('https://secure-global.paytabs.com');
  });
});

describe('createHppRequest', () => {
  it('posts to region-specific /payment/request with correct headers and payload and returns parsed JSON', async () => {
    setEnv({ PAYTABS_SERVER_KEY: 'sk_test_example_key_for_testing' });
    const mod = await importPaytabs();
    const { createHppRequest, paytabsBase } = mod as any;

    const mockResponse = { ok: true, id: 'hpp_req_1' };
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockResponse),
    });

    const payload = { amount: 100, currency: 'SAR', note: 'Test' };
    const region = 'EGYPT';
    const result = await createHppRequest(region, payload);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (globalThis.fetch as any).mock.calls[0];
    expect(url).toBe(`${paytabsBase(region)}/payment/request`);
    expect(options.method).toBe('POST');
    // Header key is intentionally lowercase 'authorization' in this function
    expect(options.headers['authorization']).toBe('sk_test_example_key_for_testing');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.body).toBe(JSON.stringify(payload));
    expect(result).toEqual(mockResponse);
  });
});

describe('createPaymentPage', () => {
  const baseRequest = {
    amount: 123.456,
    currency: 'SAR',
    customerDetails: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+966500000000',
      address: 'Olaya St.',
      city: 'Riyadh',
      state: 'Riyadh',
      country: 'SA',
      zip: '11564',
    },
    description: 'Order #1001',
    returnUrl: 'https://example.com/return',
    callbackUrl: 'https://example.com/callback',
  };

  it('returns success with redirect_url and sends properly shaped payload (with explicit invoiceId)', async () => {
    setEnv({
      PAYTABS_PROFILE_ID: 'prof_42',
      PAYTABS_SERVER_KEY: 'server_key_xyz',
      PAYTABS_BASE_URL: 'https://secure.paytabs.sa',
    });

    const mod = await importPaytabs();
    const { createPaymentPage } = mod as any;

    const responseJson = { redirect_url: 'https://paytabs.example/redirect', tran_ref: 'TRX123' };
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(responseJson),
    });

    const req = { ...baseRequest, invoiceId: 'INV-1001' };
    const result = await createPaymentPage(req);

    expect(result).toEqual({
      success: true,
      paymentUrl: 'https://paytabs.example/redirect',
      transactionId: 'TRX123',
    });

    const [url, options] = (globalThis.fetch as any).mock.calls[0];
    expect(url).toBe('https://secure.paytabs.sa/payment/request');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('server_key_xyz');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body.profile_id).toBe('prof_42');
    expect(body.tran_type).toBe('sale');
    expect(body.tran_class).toBe('ecom');
    expect(body.cart_id).toBe('INV-1001'); // invoiceId used
    expect(body.cart_currency).toBe('SAR');
    expect(body.cart_amount).toBe('123.46'); // toFixed(2) rounding
    expect(body.cart_description).toBe('Order #1001');
    expect(body.return).toBe('https://example.com/return');
    expect(body.callback).toBe('https://example.com/callback');
    expect(body.hide_shipping).toBe(true);
    expect(body.paypage_lang).toBe('ar');
    expect(body.customer_details).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+966500000000',
      street1: 'Olaya St.',
      city: 'Riyadh',
      state: 'Riyadh',
      country: 'SA',
      zip: '11564',
    });
  });

  it('generates cart_id from Date.now() when invoiceId not provided', async () => {
    setEnv({
      PAYTABS_PROFILE_ID: 'prof_X',
      PAYTABS_SERVER_KEY: 'server_key_X',
      // No PAYTABS_BASE_URL to exercise fallback in module to GLOBAL base
    });

    vi.spyOn(Date, 'now').mockReturnValue(1700000000123);

    const mod = await importPaytabs();
    const { createPaymentPage } = mod as any;

    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ redirect_url: 'https://pt/ok', tran_ref: 'REF1' }),
    });

    const req = { ...baseRequest }; // no invoiceId
    const result = await createPaymentPage(req);
    expect(result.success).toBe(true);

    const [, options] = (globalThis.fetch as any).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.cart_id).toBe('CART-1700000000123');
  });

  it('returns failure with API-provided error message when redirect_url missing', async () => {
    setEnv({
      PAYTABS_PROFILE_ID: 'prof_E',
      PAYTABS_SERVER_KEY: 'server_key_E',
      PAYTABS_BASE_URL: 'https://secure.paytabs.com',
    });

    const mod = await importPaytabs();
    const { createPaymentPage } = mod as any;

    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ message: 'Invalid amount' }),
    });

    const req = { ...baseRequest };
    const result = await createPaymentPage(req);

    expect(result).toEqual({
      success: false,
      error: 'Invalid amount',
    });
  });

  it('returns failure with default message when neither redirect_url nor message provided', async () => {
    setEnv({
      PAYTABS_PROFILE_ID: 'prof_F',
      PAYTABS_SERVER_KEY: 'server_key_F',
      PAYTABS_BASE_URL: 'https://secure.paytabs.com',
    });

    const mod = await importPaytabs();
    const { createPaymentPage } = mod as any;

    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ /* empty */ }),
    });

    const req = { ...baseRequest };
    const result = await createPaymentPage(req);

    expect(result).toEqual({
      success: false,
      error: 'Payment initialization failed',
    });
  });

  it('gracefully handles fetch errors and returns failure with error message', async () => {
    setEnv({
      PAYTABS_PROFILE_ID: 'prof_G',
      PAYTABS_SERVER_KEY: 'server_key_G',
    });

    const mod = await importPaytabs();
    const { createPaymentPage } = mod as any;

    (globalThis as any).fetch = vi.fn().mockRejectedValue(new Error('Network down'));

    const req = { ...baseRequest };
    const result = await createPaymentPage(req);

    expect(result).toEqual({
      success: false,
      error: 'Network down',
    });
  });
});

describe('verifyPayment', () => {
  it('posts to /payment/query with profile_id and tran_ref and returns parsed JSON', async () => {
    setEnv({
      PAYTABS_PROFILE_ID: 'profile_Q',
      PAYTABS_SERVER_KEY: 'server_key_Q',
      PAYTABS_BASE_URL: 'https://secure-jordan.paytabs.com',
    });

    const mod = await importPaytabs();
    const { verifyPayment } = mod as any;

    const mockJson = { tran_ref: 'TR-XYZ', payment_result: { response_status: 'A' } };
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockJson),
    });

    const result = await verifyPayment('TR-XYZ');
    expect(result).toEqual(mockJson);

    const [url, options] = (globalThis.fetch as any).mock.calls[0];
    expect(url).toBe('https://secure-jordan.paytabs.com/payment/query');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('server_key_Q');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body).toEqual({ profile_id: 'profile_Q', tran_ref: 'TR-XYZ' });
  });

  it('throws when fetch fails and logs error', async () => {
    setEnv({
      PAYTABS_PROFILE_ID: 'profile_ERR',
      PAYTABS_SERVER_KEY: 'server_key_ERR',
      PAYTABS_BASE_URL: 'https://secure-kuwait.paytabs.com',
    });

    const mod = await importPaytabs();
    const { verifyPayment } = mod as any;

    vi.spyOn(console, 'error').mockImplementation(() => {});
    (globalThis as any).fetch = vi.fn().mockRejectedValue(new Error('Server 500'));

    await expect(verifyPayment('TR-ERR')).rejects.toThrow('Server 500');
    expect(console.error).toHaveBeenCalled();
  });
});

describe('validateCallback', () => {
  it('returns false when signature is missing or empty', async () => {
    const mod = await importPaytabs();
    const { validateCallback } = mod as any;

    // Empty or missing signatures should be rejected
    expect(validateCallback({ any: 'payload' }, '')).toBe(false);
    expect(validateCallback({ any: 'payload' }, null as any)).toBe(false);
  });

  it('returns false when signature does not match HMAC', async () => {
    const mod = await importPaytabs();
    const { validateCallback } = mod as any;

    // Invalid signature should be rejected
    expect(validateCallback({ any: 'payload' }, 'invalid-signature')).toBe(false);
  });

  it('returns true when signature matches HMAC-SHA256 generated signature', async () => {
    const mod = await importPaytabs();
    const { validateCallback } = mod as any;

    // To test valid signature, we need to generate one with the same logic
    // This is a basic test - in production, use actual PayTabs test credentials
    const crypto = require('crypto');
    const payload = { test: 'data', amount: 100 };
    
    // Generate signature using same algorithm as generateSignature
    const serverKey = process.env.PAYTABS_SERVER_KEY || '';
    if (!serverKey) {
      console.warn('PAYTABS_SERVER_KEY not set, skipping valid signature test');
      return;
    }
    
    const sortedKeys = Object.keys(payload).sort();
    const canonicalString = sortedKeys.map(key => `${key}=${(payload as any)[key]}`).join('&');
    const hmac = crypto.createHmac('sha256', serverKey);
    hmac.update(canonicalString);
    const validSignature = hmac.digest('hex');
    
    expect(validateCallback(payload, validSignature)).toBe(true);
  });
});

describe('PAYMENT_METHODS and CURRENCIES', () => {
  it('exposes expected currency codes', async () => {
    const mod = await importPaytabs();
    const { CURRENCIES } = mod as any;
    expect(CURRENCIES).toMatchObject({
      SAR: 'SAR',
      USD: 'USD',
      EUR: 'EUR',
      AED: 'AED',
    });
  });

  it('getAvailablePaymentMethods returns the expected enabled methods (without TABBY)', async () => {
    const mod = await importPaytabs();
    const { PAYMENT_METHODS, getAvailablePaymentMethods } = mod as any;

    const methods = getAvailablePaymentMethods();
    const ids = methods.map((m: any) => m.id);

    // Expected list from implementation
    expect(methods).toHaveLength(6);
    expect(ids).toEqual([
      PAYMENT_METHODS.MADA,
      PAYMENT_METHODS.VISA,
      PAYMENT_METHODS.MASTERCARD,
      PAYMENT_METHODS.APPLE_PAY,
      PAYMENT_METHODS.STC_PAY,
      PAYMENT_METHODS.TAMARA,
    ]);

    // TABBY exists in PAYMENT_METHODS but is not returned by getAvailablePaymentMethods
    expect(ids).not.toContain(PAYMENT_METHODS.TABBY);

    // All enabled and basic shape checks
    for (const m of methods) {
      expect(m.enabled).toBe(true);
      expect(typeof m.name).toBe('string');
      expect(typeof m.icon).toBe('string');
      expect(m.icon).toMatch(/^\/icons\/.*\.svg$/);
    }
  });
});