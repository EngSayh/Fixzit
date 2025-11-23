/**
 * Comprehensive tests for PayTabs integration helpers.
 * Testing library/framework: Vitest
 *
 * These tests attempt to import the PayTabs module from common paths.
 * If import fails, adjust the candidate paths in importPaytabs() to match your project.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

type PaytabsModule = {
  paytabsBase: (region?: string) => string;
  createHppRequest: (region: string, payload: Record<string, unknown>) => Promise<unknown>;
  createPaymentPage: (payload: Record<string, unknown>) => Promise<unknown>;
  verifyPayment: (params: Record<string, string | undefined>) => Promise<unknown>;
  validateCallback: (payload: unknown, signature: string) => boolean;
  generateCallbackSignature: (payload: unknown) => string;
  CURRENCIES: Record<string, string>;
  PAYMENT_METHODS: Record<string, string>;
  getAvailablePaymentMethods: () => Array<{ id: string; enabled: boolean; name: string; icon: string }>;
};

const loggerMock = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

vi.mock('@/lib/logger', () => ({
  logger: loggerMock,
}));

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
  Object.values(loggerMock).forEach((fn) => fn.mockClear());
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
async function importPaytabs(): Promise<PaytabsModule> {
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
       
      return (await import(p)) as PaytabsModule;
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
    // @ts-expect-error intentionally passing invalid region to verify fallback
    expect(paytabsBase('UNKNOWN_REGION')).toBe('https://secure-global.paytabs.com');

    // Default param -> GLOBAL
    expect(paytabsBase()).toBe('https://secure-global.paytabs.com');
  });
});

describe('createHppRequest', () => {
  it('posts to region-specific /payment/request with correct headers and payload and returns parsed JSON', async () => {
    setEnv({ PAYTABS_SERVER_KEY: 'sk_test_example_key_for_testing' });
    const mod = await importPaytabs();
    const { createHppRequest, paytabsBase } = mod;

    const mockResponse = { ok: true, id: 'hpp_req_1' };
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockResponse),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const payload = { amount: 100, currency: 'SAR', note: 'Test' };
    const region = 'EGYPT';
    const result = await createHppRequest(region, payload);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
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
    const { createPaymentPage } = mod;

    const responseJson = { redirect_url: 'https://paytabs.example/redirect', tran_ref: 'TRX123' };
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(responseJson),
    }) as unknown as typeof fetch;

    const req = { ...baseRequest, invoiceId: 'INV-1001' };
    const result = await createPaymentPage(req);

    expect(result).toEqual({
      success: true,
      paymentUrl: 'https://paytabs.example/redirect',
      transactionId: 'TRX123',
    });

    const [url, options] = (globalThis.fetch as unknown as vi.Mock).mock.calls[0] as [string, RequestInit];
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
    const { createPaymentPage } = mod;

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ redirect_url: 'https://pt/ok', tran_ref: 'REF1' }),
    }) as unknown as typeof fetch;

    const req = { ...baseRequest }; // no invoiceId
    const result = await createPaymentPage(req);
    expect(result.success).toBe(true);

    const [, options] = (globalThis.fetch as unknown as vi.Mock).mock.calls[0] as [string, RequestInit];
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
    const { createPaymentPage } = mod;

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ message: 'Invalid amount' }),
    }) as unknown as typeof fetch;

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
    const { createPaymentPage } = mod;

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ /* empty */ }),
    }) as unknown as typeof fetch;

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
    const { createPaymentPage } = mod;

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network down')) as unknown as typeof fetch;

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
    const { verifyPayment } = mod;

    const mockJson = { tran_ref: 'TR-XYZ', payment_result: { response_status: 'A' } };
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockJson),
    }) as unknown as typeof fetch;

    const result = await verifyPayment('TR-XYZ');
    expect(result).toEqual(mockJson);

    const [url, options] = (globalThis.fetch as unknown as vi.Mock).mock.calls[0] as [string, RequestInit];
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
    const { verifyPayment } = mod;

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Server 500')) as unknown as typeof fetch;

    await expect(verifyPayment('TR-ERR')).rejects.toThrow('Server 500');
    expect(loggerMock.error).toHaveBeenCalled();
  });
});

describe('validateCallback', () => {
  it('returns true only when provided signature matches generated one (placeholder implementation)', async () => {
    setEnv({ PAYTABS_SERVER_KEY: 'server_key_SIG' });
    const mod = await importPaytabs();
    const { validateCallback, generateCallbackSignature } = mod;

    const payload = { any: 'payload', amount: '100' };
    const sig = generateCallbackSignature(payload);

    expect(validateCallback(payload, sig)).toBe(true);
    expect(validateCallback(payload, 'non-matching')).toBe(false);
  });
});

describe('PAYMENT_METHODS and CURRENCIES', () => {
  it('exposes expected currency codes', async () => {
    const mod = await importPaytabs();
    const { CURRENCIES } = mod;
    expect(CURRENCIES).toMatchObject({
      SAR: 'SAR',
      USD: 'USD',
      EUR: 'EUR',
      AED: 'AED',
    });
  });

  it('getAvailablePaymentMethods returns the expected enabled methods (without TABBY)', async () => {
    const mod = await importPaytabs();
    const { PAYMENT_METHODS, getAvailablePaymentMethods } = mod;

    const methods = getAvailablePaymentMethods();
    const ids = methods.map((m) => m.id);

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
