/**
 * Tests for the Help Articles GET route.
 *
 * Testing library and framework: Jest (ts-jest/Node environment assumed).
 * If using Vitest, replace jest.* with vi.* and adjust mocks accordingly.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { NextRequest } from 'next/server'

// We will mock "next/server" to control NextResponse.json behavior and avoid Next runtime dependencies
jest.mock('next/server', () => {
  return {
    // We only need the type for NextRequest; at runtime, GET only uses req.url, so we pass a minimal object.
    NextRequest: class {},
    NextResponse: {
      json: jest.fn((data: any, init?: ResponseInit) => {
        // Return a plain object that resembles a minimal Response for ease of assertions
        return {
          __mockResponse: true,
          status: init?.status ?? 200,
          data
        }
      })
    }
  }
})

const { NextResponse } = jest.requireMock('next/server')

// Mock the database module imported as "@/lib/mongodb-unified"
jest.mock('@/lib/mongodb-unified', () => ({
  getDatabase: jest.fn()
}))

import { getDatabase } from '@/lib/mongodb-unified'

// Import the route handler under test.
// Try common Next.js route locations; adjust if your project structure differs.

let GET: (req: NextRequest) => Promise<any>

// We'll attempt dynamic import paths that are commonly used in Next.js app router.
// In CI, you likely know the exact path; if different, update this accordingly.
beforeAll(async () => {
  // Try a list of potential route file locations
  const candidates = [
    'app/api/help-articles/route.ts',
    'app/api/help_articles/route.ts',
    'src/app/api/help-articles/route.ts',
    'src/app/api/help_articles/route.ts',
    'app/api/helparticles/route.ts',
    'src/app/api/helparticles/route.ts'
  ]
  let loaded = false
  for (const p of candidates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(require('path').resolve(p))
      if (mod && typeof mod.GET === 'function') {
        GET = mod.GET
        loaded = true
        break
      }
    } catch (e) {
      // continue
    }
  }
  if (!loaded) {
    // As a fallback for environments where dynamic resolution is tricky,
    // allow the tests to still run if GET was injected via global for custom setups.
    if (!((global as any).__TEST_GET_ROUTE__)) {
      throw new Error('Could not locate route file exporting GET handler. Please adjust the import path list in the tests.')
    }
    GET = (global as any).__TEST_GET_ROUTE__
  }
})

afterEach(() => {
  jest.clearAllMocks()
})

type MockColl = {
  createIndex: jest.Mock
  find: jest.Mock
  countDocuments: jest.Mock
}

function buildMockCursor(items: any[] = []) {
  const chain: any = {
    _sortArg: undefined,
    _skipArg: undefined,
    _limitArg: undefined,
    sort: jest.fn(function (this: any, arg: any) {
      chain._sortArg = arg
      return chain
    }),
    skip: jest.fn(function (this: any, n: number) {
      chain._skipArg = n
      return chain
    }),
    limit: jest.fn(function (this: any, n: number) {
      chain._limitArg = n
      return chain
    }),
    toArray: jest.fn(async () => items)
  }
  return chain
}

function setupDbMocks({
  items = [],
  total = 0
}: {
  items?: any[]
  total?: number
}) {
  const coll: MockColl = {
    createIndex: jest.fn(async () => ({ ok: 1 })),
    find: jest.fn(),
    countDocuments: jest.fn(async () => total)
  }
  const cursor = buildMockCursor(items)
  coll.find.mockReturnValue(cursor)

  ;(getDatabase as ReturnType<typeof vi.fn>).mockResolvedValue({
    collection: jest.fn(() => coll)
  })

  return { coll, cursor }
}

function makeReq(url: string): NextRequest {
  // Minimal object satisfying what GET uses (only req.url is accessed)
  return { url } as any as NextRequest
}

describe('GET /api/help-articles', () => {
  test('creates indexes and returns paginated default results (no query params)', async () => {
    const items = [{ slug: 'a', title: 'A', category: 'cat1', updatedAt: new Date().toISOString() }]
    const total = 3
    const { coll, cursor } = setupDbMocks({ items, total })

    const res = await GET(makeReq('http://localhost/api/help-articles'))
    expect(NextResponse.json).toHaveBeenCalledTimes(1)
    expect(res).toMatchObject({
      __mockResponse: true,
      status: 200,
      data: {
        items,
        page: 1,
        limit: 20,
        total,
        hasMore: true // 0 + 1 < 3
      }
    })

    // Indexes created
    expect(coll.createIndex).toHaveBeenNthCalledWith(1, { slug: 1 }, { unique: true })
    expect(coll.createIndex).toHaveBeenNthCalledWith(2, { status: 1, updatedAt: -1 })
    expect(coll.createIndex).toHaveBeenNthCalledWith(3, { title: 'text', content: 'text', tags: 'text' })

    // Default filter includes status=PUBLISHED
    const expectedFilter = { status: 'PUBLISHED' }
    expect(coll.find).toHaveBeenCalledWith(expectedFilter, {
      projection: { slug: 1, title: 1, category: 1, updatedAt: 1 }
    })

    // Sort by updatedAt desc when q not present
    expect(cursor.sort).toHaveBeenCalledWith({ updatedAt: -1 })
    expect(cursor._skipArg).toBe(0)
    expect(cursor._limitArg).toBe(20)
    expect(coll.countDocuments).toHaveBeenCalledWith(expectedFilter)
  })

  test('applies category filter and custom pagination', async () => {
    const items = new Array(5).fill(0).map((_, i) => ({ slug: `s${i}`, title: `T${i}`, category: 'howto', updatedAt: new Date().toISOString() }))
    const total = 17
    const page = 2
    const limit = 5
    const skip = (page - 1) * limit

    const { coll, cursor } = setupDbMocks({ items, total })
    const res = await GET(makeReq(`http://localhost/api/help-articles?category=howto&page=${page}&limit=${limit}`))

    expect(res.data.page).toBe(page)
    expect(res.data.limit).toBe(limit)
    expect(res.data.total).toBe(total)
    expect(res.data.items).toHaveLength(5)
    expect(res.data.hasMore).toBe(true) // 5*1 + 5 = 10 < 17

    const expectedFilter = { status: 'PUBLISHED', category: 'howto' }
    expect(coll.find).toHaveBeenCalledWith(expectedFilter, {
      projection: { slug: 1, title: 1, category: 1, updatedAt: 1 }
    })
    expect(cursor.sort).toHaveBeenCalledWith({ updatedAt: -1 })
    expect(cursor._skipArg).toBe(skip)
    expect(cursor._limitArg).toBe(limit)
    expect(coll.countDocuments).toHaveBeenCalledWith(expectedFilter)
  })

  test('clamps limit to [1, 50] and page minimum to 1', async () => {
    const { coll, cursor } = setupDbMocks({ items: [], total: 0 })
    // limit > 50 -> clamp to 50; page < 1 -> clamp to 1
    const res = await GET(makeReq('http://localhost/api/help-articles?page=-10&limit=999'))
    expect(res.data.page).toBe(1)
    expect(res.data.limit).toBe(50)
    expect(cursor._skipArg).toBe(0)
    expect(cursor._limitArg).toBe(50)
    // limit < 1 -> clamp to 1
    await GET(makeReq('http://localhost/api/help-articles?limit=0'))
    expect(cursor.limit).toHaveBeenLastCalledWith(1)
  })

  test('when q is provided, uses $text filter, textScore projection and sort by score', async () => {
    const items = [{ slug: 'match', title: 'Matched Title', category: 'faq', updatedAt: new Date().toISOString() }]
    const total = 1
    const { coll, cursor } = setupDbMocks({ items, total })

    const q = 'search words'
    const res = await GET(makeReq(`http://localhost/api/help-articles?q=${encodeURIComponent(q)}`))

    const expectedFilter: any = { status: 'PUBLISHED', $text: { $search: q } }
    expect(coll.find).toHaveBeenCalledWith(expectedFilter, {
      projection: { score: { $meta: 'textScore' }, slug: 1, title: 1, category: 1, updatedAt: 1 }
    })
    expect(cursor.sort).toHaveBeenCalledWith({ score: { $meta: 'textScore' } })
    expect(res.data.hasMore).toBe(false)
  })

  test('empty q (q=) should behave like no q (no $text filter)', async () => {
    const { coll, cursor } = setupDbMocks({ items: [], total: 0 })
    await GET(makeReq('http://localhost/api/help-articles?q='))
    const expectedFilter = { status: 'PUBLISHED' }
    expect(coll.find).toHaveBeenCalledWith(expectedFilter, {
      projection: { slug: 1, title: 1, category: 1, updatedAt: 1 }
    })
    expect(cursor.sort).toHaveBeenCalledWith({ updatedAt: -1 })
  })

  test('status can be overridden via query param', async () => {
    const { coll } = setupDbMocks({ items: [], total: 0 })
    await GET(makeReq('http://localhost/api/help-articles?status=DRAFT'))
    expect(coll.find).toHaveBeenCalledWith(
      { status: 'DRAFT' },
      { projection: { slug: 1, title: 1, category: 1, updatedAt: 1 } }
    )
  })

  test('hasMore false when skip + items.length >= total', async () => {
    const items = new Array(10).fill(0).map((_, i) => ({ slug: `s${i}`, title: `T${i}`, category: 'x', updatedAt: new Date().toISOString() }))
    const page = 2
    const limit = 10
    const total = 20
    const { cursor } = setupDbMocks({ items, total })
    const res = await GET(makeReq(`http://localhost/api/help-articles?page=${page}&limit=${limit}`))
    expect(cursor._skipArg).toBe(10)
    expect(items.length).toBe(10)
    expect(res.data.total).toBe(20)
    expect(res.data.hasMore).toBe(false) // 10 + 10 == 20
  })

  test('non-numeric page results in NaN skip propagation (current behavior)', async () => {
    const { cursor } = setupDbMocks({ items: [], total: 0 })
    await GET(makeReq('http://localhost/api/help-articles?page=abc'))
    // Current implementation does not guard against NaN -> Math.max(1, NaN) yields NaN
    expect(Number.isNaN(cursor._skipArg)).toBe(true)
  })

  test('handles errors and returns 500 with error message', async () => {
    ;(getDatabase as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('boom'))
    const res = await GET(makeReq('http://localhost/api/help-articles'))
    expect(res).toMatchObject({
      __mockResponse: true,
      status: 500,
      data: { error: 'Failed to fetch help articles' }
    })
  })
})
