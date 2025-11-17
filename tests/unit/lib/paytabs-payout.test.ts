import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const originalEnv = { ...process.env };
const runtimeGlobal = globalThis as Omit<typeof globalThis, 'fetch'> & { fetch?: typeof fetch };
let createPayout: typeof import('../../../lib/paytabs')['createPayout'];
let queryPayoutStatus: typeof import('../../../lib/paytabs')['queryPayoutStatus'];

describe('PayTabs payouts', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    process.env.PAYTABS_PROFILE_ID = 'PT-123';
    process.env.PAYTABS_SERVER_KEY = 'sk_test_xxx';
    process.env.PAYTABS_BASE_URL = 'https://secure.paytabs.test';
    vi.resetModules();
    ({ createPayout, queryPayoutStatus } = await import('../../../lib/paytabs'));
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
    vi.resetAllMocks();
    runtimeGlobal.fetch = undefined;
  });

  it('builds payout request payload and handles success responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        payout_id: 'PO-123',
        payout_status: 'COMPLETED',
        message: 'Accepted',
      }),
    });
    runtimeGlobal.fetch = fetchMock as unknown as typeof fetch;

    const result = await createPayout({
      amount: 1500.5,
      currency: 'SAR',
      reference: 'WD-1',
      description: 'Seller withdrawal',
      beneficiary: {
        name: 'ACME Seller',
        iban: 'SA4420000001234567891234',
        bank: 'Example Bank',
        accountNumber: '1234567890',
      },
      metadata: { sellerId: 'seller-1' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://secure.paytabs.test/payment/payouts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'sk_test_xxx',
          'Content-Type': 'application/json',
        }),
      }),
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.profile_id).toBe('PT-123');
    expect(body.payout_reference).toBe('WD-1');
    expect(body.payout_amount).toBe('1500.50');
    expect(body.beneficiary?.name).toBe('ACME Seller');

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected payout success');
    }
    expect(result.payoutId).toBe('PO-123');
    expect(result.status).toBe('COMPLETED');
  });

  it('returns failure result when API responds with error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ message: 'Invalid IBAN' }),
    });
    runtimeGlobal.fetch = fetchMock as unknown as typeof fetch;

    const result = await createPayout({
      amount: 100,
      currency: 'SAR',
      reference: 'WD-2',
      beneficiary: {
        name: 'Bad Seller',
        iban: 'SA00BAD',
      },
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected payout failure');
    }
    expect(result.error).toContain('Invalid IBAN');
  });

  it('queries payout status from PayTabs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        payout_id: 'PO-123',
        payout_status: 'PROCESSING',
        payout_reference: 'WD-3',
      }),
    });
    runtimeGlobal.fetch = fetchMock as unknown as typeof fetch;

    const status = await queryPayoutStatus('PO-123');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://secure.paytabs.test/payment/payouts/query',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(status.payout_reference).toBe('WD-3');
    expect(status.payout_status).toBe('PROCESSING');
  });
});
