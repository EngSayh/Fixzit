/**
 * Testing library/framework:
 * - Jest with TypeScript (ts-jest or next/jest) conventions.
 * - If the project uses Vitest, replace jest.* with vi.* and adjust mocks accordingly.
 *
 * Coverage goals:
 * - Happy paths: basic term search, synonyms expansion, default params.
 * - Edge cases: missing/whitespace query, invalid URL, invalid regex input.
 * - Failure conditions: synonym lookup errors are swallowed; top-level errors return [].
 * - Verify query building: text search terms, regex case-insensitivity, sorting, limiting, and tenant scoping.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, no-unused-vars */

const jsonMock = jest.fn()
const findOneMock = jest.fn()
const productFindMock = jest.fn()
const productSortMock = jest.fn()
const productLimitMock = jest.fn()
const productLeanMock = jest.fn()

// Mock minimal next/server surface
jest.mock('next/server', () => {
  return {
    NextResponse: {
      json: (body: any, init?: any) => {
        jsonMock(body, init)
        return { body, init }
      },
    },
  }
}, { virtual: true })

// Mock SearchSynonym model
jest.mock('@/server/models/SearchSynonym', () => {
  return {
    SearchSynonym: {
      findOne: (...args: any[]) => findOneMock(...args),
    },
  }
}, { virtual: true })

// Mock MarketplaceProduct model and its query chain
jest.mock('@/server/models/MarketplaceProduct', () => {
  return {
    MarketplaceProduct: {
      find: (...args: any[]) => productFindMock(...args),
    },
  }
}, { virtual: true })

let GET: any

beforeAll(async () => {
  // Import after mocks so that mocks are applied to the route's imports
  ({ GET } = await import('./route'))
})

function makeReq(url: string): any {
  return { url }
}

beforeEach(() => {
  jest.clearAllMocks()

  // Reset chain for each test
  productFindMock.mockImplementation(() => ({
    sort: productSortMock,
  }))
  productSortMock.mockImplementation(() => ({
    limit: productLimitMock,
  }))
  productLimitMock.mockImplementation(() => ({
    lean: productLeanMock,
  }))
})

describe('GET /api/marketplace/search', () => {
  test('returns empty items when q is missing', async () => {
    const req = makeReq('https://example.com/api/marketplace/search')
    await GET(req as any)

    expect(jsonMock).toHaveBeenCalledTimes(1)
    expect(jsonMock).toHaveBeenCalledWith({ items: [] }, undefined)
    expect(findOneMock).not.toHaveBeenCalled()
    expect(productFindMock).not.toHaveBeenCalled()
  })

  test('returns empty items when q is whitespace', async () => {
    const req = makeReq('https://example.com/api/marketplace/search?q=%20%20%20')
    await GET(req as any)

    expect(jsonMock).toHaveBeenCalledWith({ items: [] }, undefined)
    expect(findOneMock).not.toHaveBeenCalled()
    expect(productFindMock).not.toHaveBeenCalled()
  })

  test('searches with basic term when no synonyms found', async () => {
    findOneMock.mockResolvedValue(null)
    productLeanMock.mockResolvedValue([{ id: 'p1' }])

    const req = makeReq('https://example.com/api/marketplace/search?q=Phone&locale=EN&tenantId=t1')
    await GET(req as any)

    expect(findOneMock).toHaveBeenCalledWith({ locale: 'en', term: 'phone' })

    expect(productFindMock).toHaveBeenCalledTimes(1)
    const callArg = productFindMock.mock.calls[0][0]

    // tenant and OR conditions
    expect(callArg.tenantId).toBe('t1')
    expect(Array.isArray(callArg.$or)).toBe(true)
    expect(callArg.$or).toHaveLength(3)

    // Text search should reflect only original q when no synonyms
    expect(callArg.$or[0].$text.$search).toBe('Phone')

    // Regex conditions should be case-insensitive
    expect(callArg.$or[1].title).toBeInstanceOf(RegExp)
    expect(callArg.$or[1].title.ignoreCase).toBe(true)
    expect(callArg.$or[2].brand).toBeInstanceOf(RegExp)
    expect(callArg.$or[2].brand.ignoreCase).toBe(true)

    // Sort, limit, lean chain
    expect(productSortMock).toHaveBeenCalledWith({ updatedAt: -1 })
    expect(productLimitMock).toHaveBeenCalledWith(24)
    expect(productLeanMock).toHaveBeenCalled()

    expect(jsonMock).toHaveBeenCalledWith({ items: [{ id: 'p1' }] }, undefined)
  })

  test('expands with synonyms when available (includes original and provided synonyms)', async () => {
    // Intentionally include a case-variant duplicate in synonyms to validate current behavior
    findOneMock.mockResolvedValue({ synonyms: ['Case', 'phone', 'Cover'] })
    productLeanMock.mockResolvedValue([{ id: 'p2' }])

    const req = makeReq('https://example.com/api/marketplace/search?q=Phone&locale=EN')
    await GET(req as any)

    expect(findOneMock).toHaveBeenCalledWith({ locale: 'en', term: 'phone' })
    expect(productFindMock).toHaveBeenCalledTimes(1)
    const callArg = productFindMock.mock.calls[0][0]
    const searchTerms: string = callArg.$or[0].$text.$search
    const parts = new Set(searchTerms.split(' '))
    // Should include original q and each synonym
    expect(parts.has('Phone')).toBe(true)
    expect(parts.has('Case')).toBe(true)
    expect(parts.has('phone')).toBe(true)
    expect(parts.has('Cover')).toBe(true)

    expect(jsonMock).toHaveBeenCalledWith({ items: [{ id: 'p2' }] }, undefined)
  })

  test('uses default locale=en and tenantId=demo-tenant when omitted', async () => {
    findOneMock.mockResolvedValue(null)
    productLeanMock.mockResolvedValue([])

    const req = makeReq('https://example.com/api/marketplace/search?q=watch')
    await GET(req as any)

    expect(findOneMock).toHaveBeenCalledWith({ locale: 'en', term: 'watch' })
    const callArg = productFindMock.mock.calls[0][0]
    expect(callArg.tenantId).toBe('demo-tenant')
    expect(jsonMock).toHaveBeenCalledWith({ items: [] }, undefined)
  })

  test('best-effort synonyms: errors in synonym lookup are swallowed', async () => {
    findOneMock.mockRejectedValue(new Error('db down'))
    productLeanMock.mockResolvedValue([{ id: 'p3' }])

    const req = makeReq('https://example.com/api/marketplace/search?q=tablet')
    await GET(req as any)

    const callArg = productFindMock.mock.calls[0][0]
    expect(callArg.$or[0].$text.$search).toBe('tablet')
    expect(jsonMock).toHaveBeenCalledWith({ items: [{ id: 'p3' }] }, undefined)
  })

  test('when synonyms array is empty, uses only original term', async () => {
    findOneMock.mockResolvedValue({ synonyms: [] })
    productLeanMock.mockResolvedValue([{ id: 'p4' }])

    const req = makeReq('https://example.com/api/marketplace/search?q=bag')
    await GET(req as any)

    const callArg = productFindMock.mock.calls[0][0]
    expect(callArg.$or[0].$text.$search).toBe('bag')
    expect(jsonMock).toHaveBeenCalledWith({ items: [{ id: 'p4' }] }, undefined)
  })

  test('invalid regex input triggers top-level catch and returns empty items', async () => {
    // q of '[' makes new RegExp(q, 'i') throw due to unterminated character class
    const req = makeReq('https://example.com/api/marketplace/search?q=%5B')
    await GET(req as any)

    expect(productFindMock).not.toHaveBeenCalled()
    expect(jsonMock).toHaveBeenCalledWith({ items: [] }, undefined)
  })

  test('invalid URL triggers top-level catch and returns empty items', async () => {
    const badReq = { url: 'not a valid url' } as any
    await GET(badReq)

    expect(jsonMock).toHaveBeenCalledWith({ items: [] }, undefined)
  })
})
