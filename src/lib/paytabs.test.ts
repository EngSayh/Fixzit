/**
 * Tests for PayTabs utilities and API functions.
 * Testing framework note:
 * - These tests are written using Vitest conventions: import { describe, it, expect, vi, beforeEach, afterEach } from "vitest".
 * - If your project uses Jest, change the import to use Jest globals and replace 'vi' with 'jest'.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Import the module under test. Adjust the path if your implementation file resides elsewhere.
import * as paytabs from './paytabs'

const originalEnv = { ...process.env }
const FIXED_NOW = 1710000000000 // 2024-03-09T01:20:00.000Z-ish

describe('paytabsBase', () => {
  it('returns region base URL for known region', () => {
    expect(paytabs.paytabsBase('KSA')).toBe('https://secure.paytabs.sa')
    expect(paytabs.paytabsBase('UAE')).toBe('https://secure.paytabs.com')
    expect(paytabs.paytabsBase('GLOBAL')).toBe('https://secure-global.paytabs.com')
  })

  it('falls back to GLOBAL when region is unknown', () => {
    expect(paytabs.paytabsBase('UNKNOWN')).toBe('https://secure-global.paytabs.com')
    // case sensitivity check
    expect(paytabs.paytabsBase('ksa' as any)).toBe('https://secure-global.paytabs.com')
  })
})

describe('createHppRequest', () => {
  beforeEach(() => {
    process.env.PAYTABS_SERVER_KEY = 'sk_test_123'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    Object.assign(process.env, originalEnv)
    vi.restoreAllMocks()
  })

  it('posts to the region-specific HPP endpoint with correct headers and payload', async () => {
    const mockJson = { ok: true, redirect_url: 'https://example.com/pay', tran_ref: 'TRX123' }
    ;(global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue(mockJson)
    })

    const payload = { a: 1, b: 'x' }
    const res = await paytabs.createHppRequest('KSA', payload)

    expect(res).toEqual(mockJson)

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const call = (global.fetch as vi.Mock).mock.calls[0]
    expect(call[0]).toBe('https://secure.paytabs.sa/payment/request')

    const options = call[1]
    expect(options.method).toBe('POST')
    expect(options.headers).toEqual({
      'Content-Type': 'application/json',
      'authorization': 'sk_test_123',
    })
    expect(options.body).toBe(JSON.stringify(payload))
  })
})

describe('createPaymentPage', () => {
  beforeEach(() => {
    process.env.PAYTABS_PROFILE_ID = 'profile_001'
    process.env.PAYTABS_SERVER_KEY = 'sk_live_abc'
    process.env.PAYTABS_BASE_URL = 'https://base.example.com'
    vi.stubGlobal('fetch', vi.fn())
    vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW)
  })

  afterEach(() => {
    Object.assign(process.env, originalEnv)
    vi.restoreAllMocks()
  })

  const baseRequest: paytabs.PaymentRequest = {
    amount: 100,
    currency: 'SAR',
    description: 'Order #123',
    returnUrl: 'https://example.com/return',
    callbackUrl: 'https://example.com/callback',
    customerDetails: {
      name: 'John Doe',
      email: 'john@example.com',
    }
  }

  it('returns success with paymentUrl and transactionId when redirect_url is present', async () => {
    ;(global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({
        redirect_url: 'https://paytabs.com/redirect/abc',
        tran_ref: 'TRX-789'
      }),
    })

    const result = await paytabs.createPaymentPage(baseRequest)

    // Verify response mapping
    expect(result).toEqual({
      success: true,
      paymentUrl: 'https://paytabs.com/redirect/abc',
      transactionId: 'TRX-789'
    })

    // Verify request details
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, opts] = (global.fetch as vi.Mock).mock.calls[0]
    expect(url).toBe('https://base.example.com/payment/request')
    expect(opts.method).toBe('POST')
    expect(opts.headers).toEqual({
      'Authorization': 'sk_live_abc',
      'Content-Type': 'application/json'
    })

    // Parse payload and check fields
    const payload = JSON.parse(opts.body)
    expect(payload).toMatchObject({
      profile_id: 'profile_001',
      tran_type: 'sale',
      tran_class: 'ecom',
      cart_id: `CART-${FIXED_NOW}`,
      cart_currency: 'SAR',
      cart_amount: '100.00',
      cart_description: 'Order #123',
      return: 'https://example.com/return',
      callback: 'https://example.com/callback',
      customer_details: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '',
        street1: '',
        city: '',
        state: '',
        country: 'SA',
        zip: ''
      },
      hide_shipping: true,
      paypage_lang: 'ar'
    })
    // Ensure tokenise is not present by default
    expect(payload.tokenise).toBeUndefined()
  })

  it('uses provided invoiceId and formats amount with two decimals', async () => {
    ;(global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ message: 'no redirect' }),
    })

    const request = {
      ...baseRequest,
      invoiceId: 'INV-42',
      amount: 10.5
    }
    await paytabs.createPaymentPage(request)
    const [, opts] = (global.fetch as vi.Mock).mock.calls[0]
    const payload = JSON.parse(opts.body)

    expect(payload.cart_id).toBe('INV-42')
    expect(payload.cart_amount).toBe('10.50')
  })

  it('includes tokenise field when request.tokenize is true', async () => {
    ;(global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ message: 'no redirect' }),
    })

    await paytabs.createPaymentPage({ ...baseRequest, tokenize: true })
    const [, opts] = (global.fetch as vi.Mock).mock.calls[0]
    const payload = JSON.parse(opts.body)
    expect(payload.tokenise).toBe(2)
  })

  it('returns failure with message when redirect_url is missing and message exists', async () => {
    ;(global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ message: 'Bad request' }),
    })

    const result = await paytabs.createPaymentPage(baseRequest)
    expect(result).toEqual({ success: false, error: 'Bad request' })
  })

  it('returns failure with default message when redirect_url is missing and message absent', async () => {
    ;(global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({}),
    })

    const result = await paytabs.createPaymentPage(baseRequest)
    expect(result).toEqual({ success: false, error: 'Payment initialization failed' })
  })

  it('handles thrown errors and returns failure with error message', async () => {
    ;(global.fetch as unknown as vi.Mock).mockRejectedValueOnce(new Error('Network error'))

    const result = await paytabs.createPaymentPage(baseRequest)
    expect(result).toEqual({ success: false, error: 'Network error' })
  })
})

describe('verifyPayment', () => {
  beforeEach(() => {
    process.env.PAYTABS_PROFILE_ID = 'profile_002'
    process.env.PAYTABS_SERVER_KEY = 'server_key_xyz'
    process.env.PAYTABS_BASE_URL = 'https://paytabs.base'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    Object.assign(process.env, originalEnv)
    vi.restoreAllMocks()
  })

  it('posts to query endpoint with profile_id and tran_ref and returns the JSON', async () => {
    const mock = { status: 'A', tran_ref: 'TRX-001' }
    ;(global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue(mock)
    })

    const res = await paytabs.verifyPayment('TRX-001')
    expect(res).toEqual(mock)

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, opts] = (global.fetch as vi.Mock).mock.calls[0]
    expect(url).toBe('https://paytabs.base/payment/query')
    expect(opts.method).toBe('POST')
    expect(opts.headers).toEqual({
      'Authorization': 'server_key_xyz',
      'Content-Type': 'application/json'
    })
    const body = JSON.parse(opts.body)
    expect(body).toEqual({
      profile_id: 'profile_002',
      tran_ref: 'TRX-001'
    })
  })

  it('propagates thrown errors', async () => {
    ;(global.fetch as unknown as vi.Mock).mockRejectedValueOnce(new Error('Query failed'))
    await expect(paytabs.verifyPayment('TRX-ERR')).rejects.toThrow('Query failed')
  })
})

describe('createRecurringPayment', () => {
  beforeEach(() => {
    process.env.PAYTABS_PROFILE_ID = 'profile_003'
    process.env.PAYTABS_SERVER_KEY = 'server_key_rec'
    process.env.PAYTABS_BASE_URL = 'https://pt.example'
    vi.stubGlobal('fetch', vi.fn())
    vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW)
  })

  afterEach(() => {
    Object.assign(process.env, originalEnv)
    vi.restoreAllMocks()
  })

  it('posts a recurring request with correct payload and returns JSON', async () => {
    const mock = { status: 'A', tran_ref: 'REC-TRX-9' }
    ;(global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue(mock)
    })

    const res = await paytabs.createRecurringPayment('tok_abc', 55, 'USD', 'Subscription')
    expect(res).toEqual(mock)

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, opts] = (global.fetch as vi.Mock).mock.calls[0]
    expect(url).toBe('https://pt.example/payment/request')
    expect(opts.method).toBe('POST')
    expect(opts.headers).toEqual({
      'Authorization': 'server_key_rec',
      'Content-Type': 'application/json'
    })

    const payload = JSON.parse(opts.body)
    expect(payload.profile_id).toBe('profile_003')
    expect(payload.tran_type).toBe('sale')
    expect(payload.tran_class).toBe('recurring')
    expect(payload.cart_id).toBe(`REC-${FIXED_NOW}`)
    expect(payload.cart_currency).toBe('USD')
    expect(payload.cart_amount).toBe('55.00')
    expect(payload.cart_description).toBe('Subscription')
    expect(payload.token).toBe('tok_abc')
  })

  it('propagates thrown errors', async () => {
    ;(global.fetch as unknown as vi.Mock).mockRejectedValueOnce(new Error('Recurring error'))
    await expect(paytabs.createRecurringPayment('tok', 1, 'USD', 'desc')).rejects.toThrow('Recurring error')
  })
})

describe('validateCallback and generateSignature (placeholder)', () => {
  it('returns true only when signature matches calculated (currently empty string)', () => {
    // With placeholder generateSignature returning '', validateCallback should only pass with empty signature.
    expect(paytabs.validateCallback({ any: 'thing' }, '')).toBe(true)
    expect(paytabs.validateCallback({ any: 'thing' }, 'not-empty')).toBe(false)
  })
})

describe('PAYMENT_METHODS, CURRENCIES and getAvailablePaymentMethods', () => {
  it('exposes expected payment method constants', () => {
    expect(paytabs.PAYMENT_METHODS).toMatchObject({
      MADA: 'mada',
      VISA: 'visa',
      MASTERCARD: 'mastercard',
      APPLE_PAY: 'applepay',
      STC_PAY: 'stcpay',
      TAMARA: 'tamara',
      TABBY: 'tabby',
    })
  })

  it('exposes expected currency codes', () => {
    expect(paytabs.CURRENCIES).toMatchObject({
      SAR: 'SAR',
      USD: 'USD',
      EUR: 'EUR',
      AED: 'AED',
    })
  })

  it('returns enabled payment methods list with expected entries', () => {
    const methods = paytabs.getAvailablePaymentMethods()
    expect(Array.isArray(methods)).toBe(true)
    expect(methods.length).toBe(6)

    const ids = methods.map(m => m.id)
    expect(ids).toEqual(expect.arrayContaining([
      paytabs.PAYMENT_METHODS.MADA,
      paytabs.PAYMENT_METHODS.VISA,
      paytabs.PAYMENT_METHODS.MASTERCARD,
      paytabs.PAYMENT_METHODS.APPLE_PAY,
      paytabs.PAYMENT_METHODS.STC_PAY,
      paytabs.PAYMENT_METHODS.TAMARA,
    ]))

    // Verify each entry has shape and enabled: true
    for (const m of methods) {
      expect(typeof m.id).toBe('string')
      expect(typeof m.name).toBe('string')
      expect(typeof m.icon).toBe('string')
      expect(m.enabled).toBe(true)
      expect(m.icon).toMatch(/^\/icons\/.+\.svg$/)
    }
  })
})