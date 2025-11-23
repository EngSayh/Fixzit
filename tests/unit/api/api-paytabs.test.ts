/**
 * Tests for PayTabs payment page creation route handler (POST).
 * Framework: Vitest
 */
import { describe, test, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import type { NextRequest } from 'next/server'
import type { RequestInit } from 'node-fetch';
import { Config } from '@/lib/config/constants';

// Mock next/server to isolate NextResponse and avoid runtime coupling
vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server')
  // Provide a minimal NextResponse.json that returns a standard Response-like object
  return {
    ...actual,
    NextResponse: {
      json: (data: ResponseBody, init?: ResponseInit): MockResponse => {
        const status = init?.status ?? 200
        // Return a Response-like object with status and json() for assertions
        return {
          status,
          async json() {
            return data
          },
        } as MockResponse
      },
    },
  }
})

// Prefer dynamic import of the route after mocks are established
// The following path is auto-detected or a best-guess fallback if detection failed.
// Update if the route file has a different path.

type ResponseBody =
  | { ok: true; paymentUrl: string; tranRef: string }
  | { ok: false; error: string; status?: number; body?: string; details?: Record<string, unknown> }
  | { ok: false; error: string }
type MockResponse = { status: number; json: () => Promise<ResponseBody> }

const BASE_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'https://example.com',
  PAYTABS_PROFILE_ID: process.env.PAYTABS_PROFILE_ID ?? '85119',
  PAYTABS_SERVER_KEY: process.env.PAYTABS_SERVER_KEY ?? 'server-key',
  PAYTABS_MAX_ATTEMPTS: '1',
};

let POST: (req: NextRequest) => Promise<MockResponse>
beforeAll(async () => {
  process.env = { ...BASE_ENV }
  vi.resetModules()
  const mod = await import('@/app/api/payments/paytabs/route')
  POST = mod.POST as typeof POST
})

/**
 * Helper to create a mock NextRequest with just json() usage covered by the handler.
 */
const makeReq = (body: Record<string, unknown>) =>
  new Request('https://example.test/api/payments/paytabs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
  })

const textResponse = (body: string, status: number) => new Response(body, { status })

const validBody = {
  orderId: 'ORDER-123',
  amount: 199.99,
  currency: 'SAR',
  customerEmail: 'user@example.com',
  customerName: 'John Doe',
  customerPhone: '+966500000000',
}

describe('PayTabs POST route', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
    process.env = { ...BASE_ENV }
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    vi.useRealTimers()
    process.env = { ...BASE_ENV }
  })

  test('returns paymentUrl and tranRef on successful PayTabs response (happy path)', async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        redirect_url: 'https://paytabs.example/redirect',
        tran_ref: 'TRN-12345',
      })
    )

    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({
      ok: true,
      paymentUrl: 'https://paytabs.example/redirect',
      tranRef: 'TRN-12345',
    })

    // Verify payload constructed properly
    const call = fetchSpy.mock.calls[0]
    expect(call[0]).toBe('https://secure.paytabs.sa/payment/request')
    const options = call[1] as RequestInit
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.headers['Authorization']).toBe('server-key')
    const payload = JSON.parse(options.body as string)
    expect(payload).toMatchObject({
      profile_id: '85119',
      tran_type: 'sale',
      tran_class: 'ecom',
      cart_id: validBody.orderId,
      cart_currency: 'SAR',
      cart_amount: validBody.amount.toFixed(2),
      cart_description: `Fixzit Order ${validBody.orderId}`,
      customer_details: {
        name: validBody.customerName,
        email: validBody.customerEmail,
        phone: validBody.customerPhone,
        country: 'SA',
      },
      callback: `${BASE_ENV.NEXTAUTH_URL}/api/payments/paytabs/callback`,
      return: `${BASE_ENV.NEXTAUTH_URL}/marketplace/order-success`,
    })
  })

  test('uses default currency SAR when not provided', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ redirect_url: 'url', tran_ref: 'ref' }))

    const body = { ...validBody }
    delete (body as Record<string, unknown>).currency
    const res = await POST(makeReq(body))
    expect(res.status).toBe(200)
    await res.json()
    const options = fetchSpy.mock.calls[0][1] as RequestInit
    const payload = JSON.parse(options.body as string)
    expect(payload.cart_currency).toBe('SAR')
  })

  test('returns 500 when PAYTABS server key is missing', async () => {
    ;(Config as any).payment.paytabs.serverKey = ''

    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data).toEqual({ error: 'PAYTABS server key not configured' })
    expect(fetchSpy).not.toHaveBeenCalled()

    ;(Config as any).payment.paytabs.serverKey = BASE_ENV.PAYTABS_SERVER_KEY
  })

  test('propagates 502 with response details when PayTabs returns non-OK', async () => {
    fetchSpy.mockResolvedValueOnce(textResponse('Unauthorized', 401))

    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(502)
    const data = await res.json()
    expect(data).toEqual({
      error: 'PayTabs request failed',
      status: 401,
      body: 'Unauthorized',
    })
  })

  test('returns 400 when PayTabs returns no redirect_url (failure to initialize)', async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ message: 'no redirect' }))

    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data).toEqual({
      ok: false,
      error: 'Payment initialization failed',
      details: { message: 'no redirect' },
    })
  })

  test('aborts fetch after 15s timeout', async () => {
    let capturedSignal: AbortSignal | undefined
    fetchSpy.mockImplementationOnce(((...args: [string, { signal?: AbortSignal }] ) => {
      const opts = args[1]
      capturedSignal = opts?.signal
      return new Promise<Response>((_, reject) => {
        opts?.signal?.addEventListener('abort', () => reject(new Error('Aborted')), { once: true })
      }) as unknown as Response
    }) as unknown as typeof fetch)
    const resPromise = POST(makeReq(validBody)) // Start request
    // Fast-forward timers to trigger abort
    vi.advanceTimersByTime(15001)
    await expect(resPromise).resolves.toHaveProperty('status', 500)
    // Assert the signal is aborted
    expect(capturedSignal).toBeDefined()
    expect(capturedSignal?.aborted).toBe(true)
  })

  describe('input validation via zod', () => {
    test('rejects negative amount', async () => {
      const res = await POST(makeReq({ ...validBody, amount: -1 }))
      expect(res.status).toBe(500) // caught by try/catch -> 500
      const body = await res.json()
      expect(body).toEqual({ ok: false, error: 'Payment processing failed' })
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    test('rejects invalid email', async () => {
      const res = await POST(makeReq({ ...validBody, customerEmail: 'not-an-email' }))
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body).toEqual({ ok: false, error: 'Payment processing failed' })
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  test('handles unexpected fetch/json errors gracefully with 500', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('network down'))
    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ ok: false, error: 'Payment processing failed' })
  })
})
