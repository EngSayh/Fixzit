import { vi } from 'vitest';
/**
 * Tests for PayTabs callback API route.
 *
 * Framework: Vitest (describe/it/expect). Mock functions use vi.fn() from Vitest.
 *
 * Scenarios covered:
 * - Invalid signature -> 401 with { ok: false, error: 'Invalid signature' }
 * - Success path (resp_status 'A') with valid positive amount -> 200, status 'PAID', calls generateZATCAQR with correct args
 * - Success path with invalid amount (NaN / <= 0) -> 400 with { ok: false, error: 'Invalid amount' }
 * - Failure path (non-'A' status) -> 200 with status 'FAILED', does not call generateZATCAQR
 * - Malformed JSON body -> 500 with { ok: false, error: 'Callback processing failed' }
 */

import type { NextRequest } from 'next/server';

// Attempt to import the route handler from common Next.js locations.
// Adjust as necessary for the repository's actual route path.
let POST: (req: NextRequest) => Promise<Response>;
// These paths are tried in order; the first that succeeds will be used.
// If your project uses a different path, update TARGET_ROUTE_PATH.
const candidateImports = [
  // App Router conventional path
  'app/api/paytabs/callback/route',
  // Pages Router example path (export default handler)
  'pages/api/paytabs/callback',
];

let importError: unknown = null;

// Dynamic import helper that tolerates missing paths in test context.
async function resolvePOST(): Promise<void> {
  for (const modPath of candidateImports) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const mod = await import(`../../${modPath}`);
      if (typeof mod.POST === 'function') {
        POST = mod.POST as (req: NextRequest) => Promise<Response>;
        return;
      }
      // Some pages/api may export default handler(req, res). Not applicable here, but left for completeness.
      if (typeof mod.default === 'function') {
        // We can't adapt default pages/api handler to NextRequest-based signature; skip.
      }
    } catch (e) {
      importError = e;
      continue;
    }
  }
  throw new Error(
    "Unable to import route handler POST. Checked paths: " + candidateImports.join(', ') +
    ". If your route file lives elsewhere, update candidateImports in the test."
  );
}

// We will mock modules consumed by the route.
// The route imports: generateZATCAQR from '@/lib/zatca', validateCallbackRaw from '@/lib/paytabs', and NextResponse from 'next/server'.
// We mock generateZATCAQR and validateCallbackRaw to isolate logic.
// We partially mock next/server to intercept NextResponse.json calls.

const mockGenerateZATCAQR = vi.fn(async () => ({ base64: 'mock-qr-base64' }));
const mockValidateCallbackRaw = vi.fn(() => true);

// Partial mock for NextResponse.json to capture body and options
type JsonCall = { body: any; init?: ResponseInit };
const jsonCalls: JsonCall[] = [];
const mockNextResponseJson = vi.fn((body: any, init?: ResponseInit) => {
  jsonCalls.push({ body, init });
  // Construct a real Response to keep behavior consistent
  const status = init?.status ?? 200;
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
});

// Mock: next/server
vi.mock('next/server', async () => {
  // Return actual NextRequest for type compatibility but override NextResponse.json
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      json: mockNextResponseJson,
    },
  };
});

// Mock: '@/lib/zatca'
vi.mock('@/lib/zatca', () => ({
  generateZATCAQR: mockGenerateZATCAQR,
}));

// Mock: '@/lib/paytabs'
vi.mock('@/lib/paytabs', () => ({
  validateCallbackRaw: mockValidateCallbackRaw,
}));

// Utility to build a NextRequest-like object for POST with raw body and headers
function makeNextRequest(
  url = 'https://example.com/api/paytabs/callback',
  rawBody = '',
  headers: Record<string, string> = {}
): NextRequest {
  const init: RequestInit = {
    method: 'POST',
    headers,
    body: rawBody,
  };
  // Using standard Request; NextRequest extends Request and next/server accepts it in route handlers for tests.
  // Casting to NextRequest for typing; our mocked handler uses req.text()/req.headers.get('...').
  return new Request(url, init) as unknown as NextRequest;
}

describe('API PayTabs Callback - POST', () => {
  beforeAll(async () => {
    await resolvePOST();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    jsonCalls.length = 0;
  });

  it('returns 401 when signature validation fails', async () => {
    mockValidateCallbackRaw.mockReturnValueOnce(false);

    const raw = JSON.stringify({ any: 'thing' });
    const req = makeNextRequest(
      undefined,
      raw,
      { signature: 'bad-signature', 'content-type': 'application/json' }
    );

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: 'Invalid signature' });

    expect(mockValidateCallbackRaw).toHaveBeenCalledTimes(1);
    expect(mockValidateCallbackRaw).toHaveBeenCalledWith(raw, 'bad-signature');

    // Ensure no QR generation on invalid signature
    expect(mockGenerateZATCAQR).not.toHaveBeenCalled();
  });

  it('returns 200 and PAID on approved payment and valid amount, generates ZATCA QR', async () => {
    mockValidateCallbackRaw.mockReturnValueOnce(true);

    const payload = {
      tran_ref: 'T123',
      cart_id: 'C456',
      resp_status: 'A',
      resp_message: 'Approved',
      amount: '100.00',
    };
    const raw = JSON.stringify(payload);
    const req = makeNextRequest(
      undefined,
      raw,
      { signature: 'good-signature', 'content-type': 'application/json' }
    );

    const before = Date.now();
    const res = await POST(req);
    const after = Date.now();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      status: 'PAID',
      message: 'Approved',
    });

    // Validate signature check
    expect(mockValidateCallbackRaw).toHaveBeenCalledWith(raw, 'good-signature');

    // Assert QR generation with expected fields
    expect(mockGenerateZATCAQR).toHaveBeenCalledTimes(1);
    const calls = mockGenerateZATCAQR.mock.calls as unknown as Array<[any]>;
    const args = calls[0]?.[0];
    expect(args).toBeDefined();
    expect(args).toMatchObject({
      sellerName: 'Fixzit Enterprise',
      vatNumber: '300123456789012',
      total: 100,
      vat: 15.00,
    });
    // timestamp should be a recent ISO string
    expect(typeof args?.timestamp).toBe('string');
    const t = Date.parse(args?.timestamp!);
    expect(Number.isFinite(t)).toBe(true);
    expect(t).toBeGreaterThanOrEqual(before - 2000); // within a small margin
    expect(t).toBeLessThanOrEqual(after + 2000);
  });

  it('returns 400 on approved payment with non-positive amount', async () => {
    mockValidateCallbackRaw.mockReturnValueOnce(true);

    const payloads = [
      { amount: '0' },
      { amount: '-5' },
      { amount: '-0.01' },
    ];

    for (const pay of payloads) {
      const payload = {
        tran_ref: 'T0',
        cart_id: 'C0',
        resp_status: 'A',
        resp_message: 'Approved',
        amount: pay.amount,
      };
      const raw = JSON.stringify(payload);
      const req = makeNextRequest(undefined, raw, { signature: 'sig' });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ ok: false, error: 'Invalid amount' });
      expect(mockGenerateZATCAQR).not.toHaveBeenCalled();
    }
  });

  it('returns 400 on approved payment with invalid numeric amount (NaN)', async () => {
    mockValidateCallbackRaw.mockReturnValueOnce(true);

    const payload = {
      tran_ref: 'TN',
      cart_id: 'CN',
      resp_status: 'A',
      resp_message: 'Approved',
      amount: 'not-a-number',
    };
    const raw = JSON.stringify(payload);
    const req = makeNextRequest(undefined, raw, { signature: 'sig' });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: 'Invalid amount' });
    expect(mockGenerateZATCAQR).not.toHaveBeenCalled();
  });

  it('returns 200 and FAILED on non-approved status without generating QR', async () => {
    mockValidateCallbackRaw.mockReturnValueOnce(true);

    const payload = {
      tran_ref: 'TF1',
      cart_id: 'CF1',
      resp_status: 'B', // not 'A'
      resp_message: 'Declined',
      amount: '100.00',
    };
    const raw = JSON.stringify(payload);
    const req = makeNextRequest(undefined, raw, { signature: 'sig' });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      status: 'FAILED',
      message: 'Declined',
    });
    expect(mockGenerateZATCAQR).not.toHaveBeenCalled();
  });

  it('returns 500 when body is not valid JSON', async () => {
    mockValidateCallbackRaw.mockReturnValueOnce(true);

    const raw = '{invalidJson: true'; // malformed
    const req = makeNextRequest(undefined, raw, { signature: 'sig' });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: 'Callback processing failed' });
    expect(mockGenerateZATCAQR).not.toHaveBeenCalled();
  });
});