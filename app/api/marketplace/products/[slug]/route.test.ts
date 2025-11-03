// Tests for app/api/marketplace/products/[slug]/route.ts
// Framework: Vitest
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server'
import { vi } from 'vitest'

// IMPORTANT: We import the route implementation.
// If your project alias resolution differs, adjust the relative path accordingly.
import { GET } from './route'

// Mock the modules used by the route
vi.mock('@/lib/marketplace/context', () => ({
  resolveMarketplaceContext: vi.fn()
}))

vi.mock('@/lib/marketplace/search', () => ({
  findProductBySlug: vi.fn()
}))

vi.mock('@/server/models/marketplace/Category', () => ({
  default: {
    findOne: vi.fn()
  }
}))

vi.mock('@/lib/mongo', () => ({
  db: Promise.resolve()
}))

import { resolveMarketplaceContext } from '@/lib/marketplace/context'
import { findProductBySlug } from '@/lib/marketplace/search'
import Category from '@/server/models/marketplace/Category'

// Helper to read JSON body from a NextResponse (web-standard Response compatible)
async function readJson(res: Response) {
  // NextResponse extends Response; .json() is available to parse body
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await (res as any).json()
}

describe('GET /api/marketplace/products/[slug]', () => {
  const mockContext = { orgId: 'demo-org' }

  beforeEach(() => {
    (resolveMarketplaceContext as any).mockResolvedValue(mockContext)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('returns 404 when product is not found', async () => {
    (findProductBySlug as any).mockResolvedValueOnce(null)

    const req = {} as any // Minimal NextRequest stub
    const res = await GET(req, { params: Promise.resolve({ slug: 'non-existent' }) })

    expect(findProductBySlug as any).toHaveBeenCalledWith(mockContext.orgId, 'non-existent')
    expect(res.status).toBe(404)
    const body = await readJson(res as any)
    expect(body.error).toBeTruthy()
  })

  test('returns product with category when product is found', async () => {
    const mockProduct = {
      _id: 'p1',
      name: 'Test Product',
      slug: 'test-product',
      categoryId: 'cat1'
    };
    const mockCategory = {
      _id: 'cat1',
      name: 'Test Category',
      orgId: 'demo-org'
    };
    (findProductBySlug as any).mockResolvedValueOnce(mockProduct);
    (Category.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValueOnce(mockCategory)
    })

    const req = {} as any
    const res = await GET(req, { params: Promise.resolve({ slug: 'test-product' }) })

    expect(findProductBySlug as any).toHaveBeenCalledWith(mockContext.orgId, 'test-product')
    expect(res.status).toBe(200)

    const body = await readJson(res as any)
    expect(body.ok).toBe(true)
    expect(body.data.product).toEqual(mockProduct)
    expect(body.data.category).toBeTruthy()
  })

  test('returns product with null category when category not found', async () => {
    const mockProduct = {
      _id: 'p1',
      name: 'Test Product',
      slug: 'test-product',
      categoryId: 'cat1'
    };
    (findProductBySlug as any).mockResolvedValueOnce(mockProduct);
    (Category.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValueOnce(null)
    })

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'test-product' }) })
    const body = await readJson(res as any)

    expect(body.ok).toBe(true)
    expect(body.data.product).toEqual(mockProduct)
    expect(body.data.category).toBeNull()
  })

  test('handles errors from data layer by returning 500', async () => {
    (findProductBySlug as any).mockRejectedValueOnce(new Error('DB failure'))

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'boom' }) })

    expect(res.status).toBe(500)
    const body = await readJson(res as any)
    expect(body.error).toBeTruthy()
  })

  test('uses the provided slug param in the query', async () => {
    (findProductBySlug as any).mockResolvedValueOnce({ slug: 'unique-slug' });
    (Category.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValueOnce(null)
    })

    await GET({} as any, { params: Promise.resolve({ slug: 'unique-slug' }) })

    expect(findProductBySlug as any).toHaveBeenCalledWith(mockContext.orgId, 'unique-slug')
  })
})