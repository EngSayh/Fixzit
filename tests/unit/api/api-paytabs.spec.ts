/**
 * Tests for PayTabs payment page creation route handler (POST).
 * Framework: Vitest
 */
import { describe, test, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import type { NextRequest } from 'next/server'

// Mock next/server to isolate NextResponse and avoid runtime coupling
vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server')
  // Provide a minimal NextResponse.json that returns a standard Response-like object
  return {
    ...actual,
    NextResponse: {
      json: (data: any, init?: ResponseInit) => {
        const status = init?.status ?? 200
        const headersMap = new Map<string, string>()
        // Return a Response-like object with status, headers, and json() for assertions
        return {
          status,
          headers: {
            set: (key: string, value: string) => {
              headersMap.set(key, value)
            },
            get: (key: string) => headersMap.get(key) || null,
            has: (key: string) => headersMap.has(key),
            delete: (key: string) => headersMap.delete(key),
          },
          async json() {
            return data
          },
        } as unknown as Response
      },
    },
  }
})

// Prefer dynamic import of the route after mocks are established
// The following path is auto-detected or a best-guess fallback if detection failed.
// Update if the route file has a different path.

let POST: (req: NextRequest) => Promise<Response>
beforeAll(async () => {
  const mod = await import('@/app/api/payments/paytabs/route')
  POST = (mod as any).POST
})

/**
 * Helper to create a mock NextRequest with just json() usage covered by the handler.
 */
const makeReq = (body: any, url: string = 'http://localhost:3000/api/payments/paytabs') => ({ 
  json: async () => body,
  url,
  headers: {
    get: (name: string) => {
      const headers: Record<string, string> = {
        'x-forwarded-for': '127.0.0.1',
        'content-type': 'application/json'
      };
      return headers[name.toLowerCase()] || null;
    }
  }
} as unknown as NextRequest)

const validBody = {
  orderId: 'ORDER-123',
  amount: 199.99,
  currency: 'SAR',
  customerEmail: 'user@example.com',
  customerName: 'John Doe',
  customerPhone: '+966500000000',
}

describe('PayTabs POST route', () => {
  const OLD_ENV = process.env
  let fetchSpy: vi.SpyInstance

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
    process.env = { ...OLD_ENV }
    process.env.NEXTAUTH_URL = 'https://example.com'
    process.env.PAYTABS_PROFILE_ID = '85119'
    // Provide default server key unless tests override
    process.env.PAYTABS_API_SERVER_KEY = 'server-key'
    fetchSpy = vi.spyOn(globalThis, 'fetch' as any)
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    vi.useRealTimers()
    process.env = OLD_ENV
  })

  test('returns paymentUrl and tranRef on successful PayTabs response (happy path)', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        redirect_url: 'https://paytabs.example/redirect',
        tran_ref: 'TRN-12345',
      }),
      finally(cb: any) { cb?.(); return this },
    } as any)

    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(200)
    const data = await (res as any).json()
    expect(data).toEqual({
      ok: true,
      paymentUrl: 'https://paytabs.example/redirect',
      tranRef: 'TRN-12345',
    })

    // Verify payload constructed properly
    const call = fetchSpy.mock.calls[0]
    expect(call[0]).toBe('https://secure.paytabs.sa/payment/request')
    const options = call[1]
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.headers['Authorization']).toBe('server-key')
    const payload = JSON.parse(options.body)
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
      callback: `${process.env.NEXTAUTH_URL}/api/payments/paytabs/callback`,
      return: `${process.env.NEXTAUTH_URL}/marketplace/order-success`,
    })
  })

  test('uses default currency SAR when not provided', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ redirect_url: 'url', tran_ref: 'ref' }),
      finally(cb: any) { cb?.(); return this },
    } as any)

    const body = { ...validBody }
    delete (body as any).currency
    const res = await POST(makeReq(body))
    expect(res.status).toBe(200)
    await (res as any).json()
    const options = fetchSpy.mock.calls[0][1]
    const payload = JSON.parse(options.body)
    expect(payload.cart_currency).toBe('SAR')
  })

  test('returns 500 when PAYTABS server key is missing', async () => {
    delete process.env.PAYTABS_API_SERVER_KEY
    delete process.env.PAYTABS_SERVER_KEY

    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(500)
    const data = await (res as any).json()
    expect(data).toEqual({ ok: false, error: 'PAYTABS server key not configured' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  test('propagates 502 with response details when PayTabs returns non-OK', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
      finally(cb: any) { cb?.(); return this },
    } as any)

    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(502)
    const data = await (res as any).json()
    expect(data).toEqual({
      ok: false,
      error: 'PayTabs request failed',
      status: 401,
      body: 'Unauthorized',
    })
  })

  test('returns 400 when PayTabs returns no redirect_url (failure to initialize)', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'no redirect' }),
      finally(cb: any) { cb?.(); return this },
    } as any)

    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(400)
    const data = await (res as any).json()
    expect(data).toEqual({
      ok: false,
      error: 'Payment initialization failed',
      details: { message: 'no redirect' },
    })
  })

  test('aborts fetch after 15s timeout', async () => {
    let capturedSignal: AbortSignal | undefined
    fetchSpy.mockImplementationOnce((_url: string, opts: any) => {
      capturedSignal = opts.signal
      // Return a promise that waits for abort signal
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          reject(new Error('The operation was aborted'))
        })
      })
    })
    
    const promise = POST(makeReq(validBody))
    
    // Give a tick for the fetch to start
    await vi.waitFor(() => {
      expect(capturedSignal).toBeDefined()
    }, { timeout: 100 })
    
    // Fast-forward timers to trigger abort
    await vi.advanceTimersByTimeAsync(15001)
    
    // Wait for the promise to reject
    await expect(promise).resolves.toBeDefined()
    
    // Assert the signal was aborted
    expect(capturedSignal?.aborted).toBe(true)
  })

  describe('input validation via zod', () => {
    test('rejects negative amount', async () => {
      const res = await POST(makeReq({ ...validBody, amount: -1 }))
      expect(res.status).toBe(500) // caught by try/catch -> 500
      const body = await (res as any).json()
      expect(body).toEqual({ ok: false, error: 'Payment processing failed' })
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    test('rejects invalid email', async () => {
      const res = await POST(makeReq({ ...validBody, customerEmail: 'not-an-email' }))
      expect(res.status).toBe(500)
      const body = await (res as any).json()
      expect(body).toEqual({ ok: false, error: 'Payment processing failed' })
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  test('handles unexpected fetch/json errors gracefully with 500', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('network down'))
    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(500)
    const body = await (res as any).json()
    expect(body).toEqual({ ok: false, error: 'Payment processing failed' })
  })
})