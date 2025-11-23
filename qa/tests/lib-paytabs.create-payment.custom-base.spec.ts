// Framework: Playwright Test (@playwright/test)
import { test, expect } from '@playwright/test';
import { createPaymentPage, verifyPayment } from '../../lib/paytabs.js';

type FetchArgs = Parameters<typeof fetch>;

test.describe('lib/paytabs - custom base URL via env', () => {
  test('createPaymentPage uses PAYTABS_BASE_URL when provided', async () => {
    process.env.PAYTABS_BASE_URL = 'https://custom.paytabs.example';
    process.env.PAYTABS_PROFILE_ID = 'custom-profile';
    process.env.PAYTABS_SERVER_KEY = 'custom-key';

    const originalFetch = globalThis.fetch;
    const calls: FetchArgs[] = [];
    globalThis.fetch = ((...args: FetchArgs) => {
      calls.push(args);
      return Promise.resolve({ json: async () => ({ redirect_url: 'url', tran_ref: 'ref' }) } as unknown as Response);
    }) as typeof fetch;

    try {
      await createPaymentPage({
        amount: 1, currency: 'SAR',
        customerDetails: { name: 'n', email: 'e', phone: 'p', address: 'a', city: 'c', state: 's', country: 'SA', zip: 'z' },
        description: 'd', returnUrl: 'u1', callbackUrl: 'u2',
      } as any);

      expect(calls[0][0]).toBe('https://custom.paytabs.example/payment/request');
      expect(calls[0][1].headers.Authorization).toBe('custom-key');
    } finally {
      globalThis.fetch = originalFetch as typeof fetch;
    }
  });

  test('verifyPayment uses PAYTABS_BASE_URL and includes profile_id + tran_ref', async () => {
    process.env.PAYTABS_BASE_URL = 'https://api.paytabs.test';
    process.env.PAYTABS_PROFILE_ID = 'profile-123';
    process.env.PAYTABS_SERVER_KEY = 'server-123';

    const originalFetch = globalThis.fetch;
    const calls: FetchArgs[] = [];
    globalThis.fetch = ((...args: FetchArgs) => {
      calls.push(args);
      return Promise.resolve({ json: async () => ({ ok: true }) } as unknown as Response);
    }) as typeof fetch;

    try {
      await verifyPayment('REF-999');

      expect(calls).toHaveLength(1);
      expect(calls[0][0]).toBe('https://api.paytabs.test/payment/query');
      expect(calls[0][1].headers.Authorization).toBe('server-123');

      const body = JSON.parse(calls[0][1]?.body as string);
      expect(body.profile_id).toBe('profile-123');
      expect(body.tran_ref).toBe('REF-999');
    } finally {
      globalThis.fetch = originalFetch as typeof fetch;
    }
  });

  test('verifyPayment propagates network and JSON errors and logs', async () => {
    process.env.PAYTABS_BASE_URL = 'https://api.paytabs.test';
    process.env.PAYTABS_PROFILE_ID = 'profile-123';
    process.env.PAYTABS_SERVER_KEY = 'server-123';

    // Stub console.error
    const originalConsoleError = console.error;
    console.error = ((..._args: unknown[]) => {}) as typeof console.error;

    // Network error
    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((..._args: FetchArgs) => Promise.reject(new Error('Connection refused'))) as typeof fetch;
    await expect(verifyPayment('TST-1')).rejects.toThrow('Connection refused');

    // Invalid JSON (json() rejects)
    globalThis.fetch = ((..._args: FetchArgs) => Promise.resolve({ json: async () => { throw new Error('Invalid JSON'); } } as unknown as Response)) as typeof fetch;
    await expect(verifyPayment('TST-2')).rejects.toThrow('Invalid JSON');

    // Empty ref still forwarded
    globalThis.fetch = ((..._args: FetchArgs) => Promise.resolve({ json: async () => ({}) } as unknown as Response)) as typeof fetch;
    await verifyPayment('');
    // ensure it sent empty
    // (We can't inspect here since fetch was replaced; quick re-wrap with capture)
    const calls: FetchArgs[] = [];
    globalThis.fetch = ((...args: FetchArgs) => {
      calls.push(args);
      return Promise.resolve({ json: async () => ({}) } as unknown as Response);
    }) as typeof fetch;
    await verifyPayment('');
    const sent = JSON.parse(calls[0][1]?.body as string);
    expect(sent.tran_ref).toBe('');

    // Restore
    globalThis.fetch = originalFetch as typeof fetch;
    console.error = originalConsoleError;
  });
});
