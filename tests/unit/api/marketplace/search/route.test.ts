/**
 * Testing library/framework:
 * - Vitest with TypeScript
 *
 * Coverage goals:
 * - Happy paths: basic term search, synonyms expansion, default params.
 * - Edge cases: missing/whitespace query, invalid URL, invalid regex input.
 * - Failure conditions: synonym lookup errors are swallowed; top-level errors return [].
 * - Verify query building: text search terms, regex case-insensitivity, sorting, limiting, and tenant scoping.
 */

 

import { vi } from 'vitest';

const jsonMock = vi.fn()
const findOneMock = vi.fn()
const productFindMock = vi.fn()
const productSortMock = vi.fn()
const productLimitMock = vi.fn()
const productLeanMock = vi.fn()

// Mock minimal next/server surface
vi.mock('next/server', () => {
  return {
    NextRequest: class MockNextRequest {
      url: string;
      nextUrl: any;
      headers: Map<string, string>;
      method: string;
      
      constructor(url: string | URL) {
        const urlObj = typeof url === 'string' ? new URL(url, 'http://localhost:3000') : url;
        this.url = urlObj.toString();
        this.nextUrl = {
          href: urlObj.toString(),
          pathname: urlObj.pathname,
          search: urlObj.search,
          searchParams: urlObj.searchParams,
        };
        // Use a Map with get/set methods instead of Headers
        this.headers = {
          get: (name: string) => '',
          set: (name: string, value: string) => {},
          has: (name: string) => false,
          delete: (name: string) => {},
          forEach: (callback: any) => {},
        } as any;
        this.method = 'GET';
      }
    },
    NextResponse: {
      json: (body: any, init?: any) => {
        jsonMock(body, init)
        return { body, init }
      },
    },
  }
})

// Mock SearchSynonym model
vi.mock('@/server/models/SearchSynonym', () => {
  return {
    SearchSynonym: {
      findOne: (...args: any[]) => findOneMock(...args),
    },
  }
})

// Mock MarketplaceProduct model and its query chain
vi.mock('@/server/models/MarketplaceProduct', () => {
  return {
    MarketplaceProduct: {
      find: (...args: any[]) => productFindMock(...args),
    },
  }
})

// Mock resolveMarketplaceContext to avoid header parsing complexity
vi.mock('@/lib/marketplace/context', () => ({
  resolveMarketplaceContext: vi.fn(async () => ({
    tenantKey: 'demo-tenant',
    orgId: 'demo-tenant',
    userId: undefined,
    role: 'BUYER',
    correlationId: 'test-correlation-id',
  })),
}))

// Mock createSecureResponse to avoid CORS header manipulation
vi.mock('@/server/security/headers', () => ({
  createSecureResponse: vi.fn((data: any) => {
    return {
      json: () => data,
      status: 500,
      headers: new Map(),
    };
  }),
}))

// Mock searchProducts
vi.mock('@/lib/marketplace/search', () => ({
  searchProducts: vi.fn(async () => ({
    items: [],
    pagination: { total: 0 },
    facets: { brands: [], standards: [], categories: [] },
  })),
  findProductBySlug: vi.fn(),
}))

// Mock Category model
vi.mock('@/server/models/marketplace/Category', () => ({
  default: {
    findOne: vi.fn(async () => null),
    find: vi.fn(() => ({
      lean: vi.fn(async () => []),
    })),
  },
}))

// Mock serializeCategory
vi.mock('@/lib/marketplace/serializers', () => ({
  serializeCategory: vi.fn((doc: any) => doc),
}))

// Mock database connection
vi.mock('@/lib/mongodb-unified', () => ({
  connectToDatabase: vi.fn(async () => {}),
}))

// Mock error responses
vi.mock('@/server/utils/errorResponses', () => ({
  zodValidationError: vi.fn((error: any, req: any) => ({ status: 400, body: { error: 'Validation failed' } })),
  notFoundError: vi.fn((entity: string) => ({ status: 404, body: { error: 'Not found' } })),
}))

let GET: any

beforeAll(async () => {
  // Import after mocks so that mocks are applied to the route's imports
  ({ GET } = await import('./route'))
})

function makeReq(url: string): any {
  const { NextRequest } = require('next/server');
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks()

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
    await GET(req as unknown)

    expect(jsonMock).toHaveBeenCalledTimes(1)
    const callArgs = jsonMock.mock.calls[0][0];
    expect(callArgs).toMatchObject({
      ok: true,
      data: {
        items: [],
        pagination: expect.objectContaining({ total: 0 }),
        facets: expect.objectContaining({ brands: [], standards: [], categories: [] })
      }
    })
  })

  test('returns empty items when q is whitespace', async () => {
    const req = makeReq('https://example.com/api/marketplace/search?q=%20%20%20')
    await GET(req as unknown)

    const callArgs = jsonMock.mock.calls[0][0];
    expect(callArgs).toMatchObject({
      ok: true,
      data: {
        items: [],
      }
    })
  })

  test('searches with basic term when no synonyms found', async () => {
    findOneMock.mockResolvedValue(null)
    productLeanMock.mockResolvedValue([{ id: 'p1' }])

    const req = makeReq('https://example.com/api/marketplace/search?q=Phone&locale=EN&tenantId=t1')
    await GET(req as unknown)

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
    await GET(req as unknown)

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
    await GET(req as unknown)

    expect(findOneMock).toHaveBeenCalledWith({ locale: 'en', term: 'watch' })
    const callArg = productFindMock.mock.calls[0][0]
    expect(callArg.tenantId).toBe('demo-tenant')
    expect(jsonMock).toHaveBeenCalledWith({ items: [] }, undefined)
  })

  test('best-effort synonyms: errors in synonym lookup are swallowed', async () => {
    findOneMock.mockRejectedValue(new Error('db down'))
    productLeanMock.mockResolvedValue([{ id: 'p3' }])

    const req = makeReq('https://example.com/api/marketplace/search?q=tablet')
    await GET(req as unknown)

    const callArg = productFindMock.mock.calls[0][0]
    expect(callArg.$or[0].$text.$search).toBe('tablet')
    expect(jsonMock).toHaveBeenCalledWith({ items: [{ id: 'p3' }] }, undefined)
  })

  test('when synonyms array is empty, uses only original term', async () => {
    findOneMock.mockResolvedValue({ synonyms: [] })
    productLeanMock.mockResolvedValue([{ id: 'p4' }])

    const req = makeReq('https://example.com/api/marketplace/search?q=bag')
    await GET(req as unknown)

    const callArg = productFindMock.mock.calls[0][0]
    expect(callArg.$or[0].$text.$search).toBe('bag')
    expect(jsonMock).toHaveBeenCalledWith({ items: [{ id: 'p4' }] }, undefined)
  })

  test('invalid regex input triggers top-level catch and returns empty items', async () => {
    // q of '[' makes new RegExp(q, 'i') throw due to unterminated character class
    const req = makeReq('https://example.com/api/marketplace/search?q=%5B')
    await GET(req as unknown)

    expect(productFindMock).not.toHaveBeenCalled()
    expect(jsonMock).toHaveBeenCalledWith({ items: [] }, undefined)
  })

  test('invalid URL triggers top-level catch and returns empty items', async () => {
    const badReq = { url: 'not a valid url' } as unknown
    await GET(badReq)

    expect(jsonMock).toHaveBeenCalledWith({ items: [] }, undefined)
  })
})

