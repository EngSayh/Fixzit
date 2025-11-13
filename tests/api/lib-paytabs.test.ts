/**
 * Tests for PayTabs integration helpers.
 * Testing framework: Vitest.
 * If your project uses Vitest/Mocha, adapt describe/it/expect/mocking accordingly.
 */

import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

 // We will dynamically import the module under test using a relative path guess.
 // Update the import below to match your actual module path if different.
 // Try common locations in order via require.resolve in a try/catch chain.
interface PayTabsHelpers {
  // Add expected function signatures here, e.g.:
  // createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
  // verifyPayment(id: string): Promise<VerificationResult>;
  // For now, use index signature to allow any property, but avoid `any` type.
  [key: string]: unknown;
}
let lib: PayTabsHelpers;
// Define the exact path to the PayTabs helpers module here.
const PAYTABS_HELPERS_MODULE_PATH = '../../lib-paytabs'; // <-- Update this path as needed
function loadModule() {
   
  try {
    return require(PAYTABS_HELPERS_MODULE_PATH);
  } catch (e) {
    throw new Error(`Could not resolve module for PayTabs helpers at "${PAYTABS_HELPERS_MODULE_PATH}". Please adjust PAYTABS_HELPERS_MODULE_PATH in qa/tests/lib-paytabs.spec.ts`);
  }
}

// Lazy-load once for all tests
beforeAll(() => {
  lib = loadModule();
});

// Helpers to stub global fetch and crypto.subtle
type FetchResponse = {
  ok?: boolean;
  status?: number;
  json: () => Promise<any>;
};
function mockFetchOnce(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<FetchResponse>) {
  (global as any).fetch = vi.fn(impl);
}

function setEnv(obj: Record<string, string | undefined>) {
  const backup: Record<string, string | undefined> = {};
  for (const k of Object.keys(obj)) {
    backup[k] = process.env[k];
    if (typeof obj[k] === 'undefined') delete (process.env as any)[k];
    else process.env[k] = obj[k] as string;
  }
  return () => {
    for (const k of Object.keys(backup)) {
      if (typeof backup[k] === 'undefined') delete (process.env as any)[k];
      else process.env[k] = backup[k] as string;
    }
  };
}

describe('paytabsBase', () => {
  it('returns base URL for known regions and falls back to GLOBAL', () => {
    const { paytabsBase } = lib as any;
    expect(paytabsBase('KSA')).toBe('https://secure.paytabs.sa');
    expect(paytabsBase('UAE')).toBe('https://secure.paytabs.com');
    expect(paytabsBase('EGYPT')).toBe('https://secure-egypt.paytabs.com');
    expect(paytabsBase('OMAN')).toBe('https://secure-oman.paytabs.com');
    expect(paytabsBase('JORDAN')).toBe('https://secure-jordan.paytabs.com');
    expect(paytabsBase('KUWAIT')).toBe('https://secure-kuwait.paytabs.com');
    expect(paytabsBase('GLOBAL')).toBe('https://secure-global.paytabs.com');
    // edge: unknown region
    expect(paytabsBase('NOPE')).toBe('https://secure-global.paytabs.com');
    // default param
    expect(paytabsBase()).toBe('https://secure-global.paytabs.com');
  });
});

describe('createHppRequest', () => {
  const restoreEnv = setEnv({ PAYTABS_SERVER_KEY: 'sv_key_123' });
  afterAll(restoreEnv);

  it('POSTs to region-specific endpoint with correct headers and body', async () => {
    const { createHppRequest } = lib as any;
    const payload = { a: 1, b: 'x' };

    mockFetchOnce(async (input, init) => {
      expect(String(input)).toBe('https://secure.paytabs.com/payment/request'); // UAE
      expect(init?.method).toBe('POST');
      expect(init?.headers).toMatchObject({
        'Content-Type': 'application/json',
        authorization: 'sv_key_123',
      });
      expect(init?.body).toBe(JSON.stringify(payload));
      return { json: async () => ({ ok: true, echo: payload }) };
    });

    const res = await createHppRequest('UAE', payload);
    expect(res).toEqual({ ok: true, echo: payload });
  });

  it('falls back to GLOBAL region when unknown', async () => {
    const { createHppRequest } = lib as any;

    mockFetchOnce(async (input, _init) => {
      expect(String(input)).toBe('https://secure-global.paytabs.com/payment/request');
      return { json: async () => ({ ok: true }) };
    });

    const res = await createHppRequest('UNKNOWN', {});
    expect(res).toEqual({ ok: true });
  });

  it('uses PAYTABS_API_SERVER_KEY if PAYTABS_SERVER_KEY missing (indirect via headers variable)', async () => {
    const restore = setEnv({ PAYTABS_SERVER_KEY: undefined, PAYTABS_API_SERVER_KEY: 'api_sv_key' });
    try {
      const { createHppRequest } = lib as any;

      mockFetchOnce(async (_input, init) => {
        expect(init?.headers).toMatchObject({ authorization: 'api_sv_key' });
        return { json: async () => ({ ok: true }) };
      });

      await createHppRequest('GLOBAL', {});
    } finally {
      restore();
    }
  });
});

describe('createPaymentPage', () => {
  const PAYTABS_CONFIG = {
    baseUrl: 'https://api.example.com',
    serverKey: 'sk_live_abc',
    profileId: 'prof_123',
  };

  beforeEach(() => {
    // Inject PAYTABS_CONFIG as a writable global/module var if present
    // If the library reads PAYTABS_CONFIG from its own module scope, we need it to exist.
    (global as any).PAYTABS_CONFIG = PAYTABS_CONFIG;
  });

  it('returns success with url and transaction id when redirect_url present', async () => {
    const { createPaymentPage } = lib as any;
    const request = {
      invoiceId: 'INV-1',
      currency: 'SAR',
      amount: 100.235, // should get fixed to 2 decimals
      description: 'Order #1',
      returnUrl: 'https://merchant/return',
      callbackUrl: 'https://merchant/callback',
      customerDetails: {
        name: 'John',
        email: 'john@example.com',
        phone: '+966500000000',
        address: 'Street 1',
        city: 'Riyadh',
        state: 'Riyadh',
        country: 'SA',
        zip: '12345',
      },
    };

    mockFetchOnce(async (input, init) => {
      expect(String(input)).toBe('https://api.example.com/payment/request');
      expect(init?.method).toBe('POST');
      expect(init?.headers).toMatchObject({
        Authorization: 'sk_live_abc',
        'Content-Type': 'application/json',
      });
      const sent = JSON.parse(String(init?.body));
      expect(sent.profile_id).toBe('prof_123');
      expect(sent.tran_type).toBe('sale');
      expect(sent.tran_class).toBe('ecom');
      expect(sent.cart_id).toBe('INV-1');
      expect(sent.cart_currency).toBe('SAR');
      expect(sent.cart_amount).toBe('100.24'); // rounded to 2 decimals
      expect(sent.return).toBe('https://merchant/return');
      expect(sent.callback).toBe('https://merchant/callback');
      expect(sent.hide_shipping).toBe(true);
      expect(sent.paypage_lang).toBe('ar');
      return {
        json: async () => ({ redirect_url: 'https://pt/redirect', tran_ref: 'T123' }),
      };
    });

    const res = await createPaymentPage(request);
    expect(res).toEqual({ success: true, paymentUrl: 'https://pt/redirect', transactionId: 'T123' });
  });

  it('generates cart_id when invoiceId is missing and handles failure without redirect_url', async () => {
    const { createPaymentPage } = lib as any;
    const request = {
      currency: 'SAR',
      amount: 50,
      description: 'Order #2',
      returnUrl: 'https://merchant/return',
      callbackUrl: 'https://merchant/callback',
      customerDetails: {
        name: 'Jane',
        email: 'jane@example.com',
        phone: '+966500000001',
        address: 'Street 2',
        city: 'Jeddah',
        state: 'Makkah',
        country: 'SA',
        zip: '54321',
      },
    };

    mockFetchOnce(async (_input, _init) => {
      return { json: async () => ({ message: 'Invalid profile' }) };
    });

    const res = await createPaymentPage(request);
    expect(res).toEqual({ success: false, error: 'Invalid profile' });
  });

  it('returns generic error when fetch throws', async () => {
    const { createPaymentPage } = lib as any;

    // Throw error
    // @ts-ignore
    global.fetch = vi.fn(async () => {
      throw new Error('Network down');
    });

    const res = await createPaymentPage({
      currency: 'SAR',
      amount: 10,
      description: 'x',
      returnUrl: 'https://merchant/return',
      callbackUrl: 'https://merchant/callback',
      customerDetails: {
        name: 'X',
        email: 'x@x.com',
        phone: '0',
        address: 'a',
        city: 'c',
        state: 's',
        country: 'SA',
        zip: 'z',
      },
    });

    expect(res).toEqual({ success: false, error: 'Network down' });
  });
});

describe('verifyPayment', () => {
  const PAYTABS_CONFIG = {
    baseUrl: 'https://api.example.com',
    serverKey: 'sk_live_abc',
    profileId: 'prof_123',
  };

  beforeEach(() => {
    (global as any).PAYTABS_CONFIG = PAYTABS_CONFIG;
  });

  it('POSTs to query endpoint and returns parsed JSON', async () => {
    const { verifyPayment } = lib as any;

    mockFetchOnce(async (input, init) => {
      expect(String(input)).toBe('https://api.example.com/payment/query');
      expect(init?.method).toBe('POST');
      expect(init?.headers).toMatchObject({
        Authorization: 'sk_live_abc',
        'Content-Type': 'application/json',
      });
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({ profile_id: 'prof_123', tran_ref: 'TREF' });
      return { json: async () => ({ status: 'A', tran_ref: 'TREF' }) };
    });

    const res = await verifyPayment('TREF');
    expect(res).toEqual({ status: 'A', tran_ref: 'TREF' });
  });

  it('rethrows on fetch error', async () => {
    const { verifyPayment } = lib as any;

    // @ts-ignore
    global.fetch = vi.fn(async () => {
      throw new Error('timeout');
    });

    await expect(verifyPayment('X')).rejects.toThrow('timeout');
  });
});

describe('validateCallbackRaw (HMAC SHA-256 verification)', () => {
  const restoreEnv = setEnv({ PAYTABS_API_SERVER_KEY: 'server_key', PAYTABS_SERVER_KEY: undefined });
  afterAll(restoreEnv);

  // Minimal mock for WebCrypto subtle.sign producing deterministic bytes
  function setCryptoMock(signatureBytes: Uint8Array) {
    (global as any).crypto = {
      subtle: {
        importKey: vi.fn(async () => ({} as CryptoKey)),
        sign: vi.fn(async (_algo: string, _key: any, _data: ArrayBuffer) => {
          return signatureBytes.buffer as ArrayBuffer;
        }),
      } as any,
    };
  }

  it('returns false when server key missing or signature missing', async () => {
    const { validateCallbackRaw } = lib as any;

    // No server key
    const restore = setEnv({ PAYTABS_API_SERVER_KEY: undefined, PAYTABS_SERVER_KEY: undefined });
    expect(await validateCallbackRaw('body', 'aa')).toBe(false);
    restore();

    // No signature
    expect(await validateCallbackRaw('body', undefined)).toBe(false);
    expect(await validateCallbackRaw('body', null as any)).toBe(false);
  });

  it('returns true on exact signature match (constant-time compare)', async () => {
    const { validateCallbackRaw } = lib as any;
    // signature bytes -> hex "0a0b0c"
    const bytes = new Uint8Array([0x0a, 0x0b, 0x0c]);
    setCryptoMock(bytes);
    // Expected hex string
    const sigHex = '0a0b0c';
    const ok = await validateCallbackRaw('raw-body', sigHex);
    expect(ok).toBe(true);
  });

  it('returns false on length mismatch', async () => {
    const { validateCallbackRaw } = lib as any;
    const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]); // hex "deadbeef"
    setCryptoMock(bytes);
    const notSameLen = 'deadbee'; // one nibble short
    const ok = await validateCallbackRaw('raw', notSameLen);
    expect(ok).toBe(false);
  });

  it('returns false when any character differs', async () => {
    const { validateCallbackRaw } = lib as any;
    const bytes = new Uint8Array([0xaa, 0xbb]); // "aabb"
    setCryptoMock(bytes);
    expect(await validateCallbackRaw('raw', 'aaba')).toBe(false);
  });

  it('returns false on crypto error', async () => {
    const { validateCallbackRaw } = lib as any;
    // Force subtle.sign to throw
    (global as any).crypto = {
      subtle: {
        importKey: vi.fn(async () => ({} as CryptoKey)),
        sign: vi.fn(async () => { throw new Error('subtle failed'); }),
      } as any,
    };
    const res = await validateCallbackRaw('raw', '00');
    expect(res).toBe(false);
  });
});

describe('constants and helpers', () => {
  it('PAYMENT_METHODS contains expected KSA methods', () => {
    const { PAYMENT_METHODS } = lib;
    expect(PAYMENT_METHODS).toMatchObject({
      MADA: 'mada',
      VISA: 'visa',
      MASTERCARD: 'mastercard',
      APPLE_PAY: 'applepay',
      STC_PAY: 'stcpay',
      TAMARA: 'tamara',
      TABBY: 'tabby',
    });
  });

  it('CURRENCIES includes SAR, USD, EUR, AED', () => {
    const { CURRENCIES } = lib as any;
    expect(CURRENCIES.SAR).toBe('SAR');
    expect(CURRENCIES.USD).toBe('USD');
    expect(CURRENCIES.EUR).toBe('EUR');
    expect(CURRENCIES.AED).toBe('AED');
  });

  it('getAvailablePaymentMethods returns enabled list with expected shapes', () => {
    const { getAvailablePaymentMethods, PAYMENT_METHODS } = lib as any;
    const list = getAvailablePaymentMethods();
    expect(Array.isArray(list)).toBe(true);
    // ensure unique ids and all enabled
    const ids = new Set<string>();
    for (const m of list) {
      expect(typeof m.id).toBe('string');
      expect(typeof m.name).toBe('string');
      expect(typeof m.icon).toBe('string');
      expect(m.enabled).toBe(true);
      ids.add(m.id);
    }
    expect(ids.has(PAYMENT_METHODS.MADA)).toBe(true);
    expect(ids.has(PAYMENT_METHODS.VISA)).toBe(true);
    expect(ids.has(PAYMENT_METHODS.MASTERCARD)).toBe(true);
    expect(ids.has(PAYMENT_METHODS.APPLE_PAY)).toBe(true);
    expect(ids.has(PAYMENT_METHODS.STC_PAY)).toBe(true);
    expect(ids.has(PAYMENT_METHODS.TAMARA)).toBe(true);
  });
});