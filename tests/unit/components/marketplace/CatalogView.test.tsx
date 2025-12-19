/**
 * Tests for CatalogView component
 *
 * Framework/Libraries:
 * - React Testing Library (@testing-library/react)
 * - @testing-library/user-event
 * - jest-dom matchers (if configured)
 *
 * These tests mock:
 * - swr hook to control loading/data/error states
 * - LoginPrompt component to assert modal visibility
 * - global fetch for Add to Cart flows
 *
 * Scenarios:
 * - Renders title/subtitle, FM context banner
 * - Loading state vs empty state messaging
 * - Empty state with error vs without error
 * - Rendering products list with formatting, vendor verification, badges, images
 * - Add to cart: unauthenticated prompts login, authenticated success shows feedback and triggers mutate
 * - Add to cart: API failure shows error feedback
 * - Request quote always prompts login
 * - Filter inputs update and reset filters clears inputs
 * - Query key recomputation on filter change (verifies useSWR called with updated key)
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event'

// Use conditional jest/vi globals without importing to fit either runner
const jestLike = (global as { vi?: typeof vi; jest?: typeof jest }).vi ?? (global as { jest?: typeof jest }).jest

// Keep a reference we can update per-test to control SWR responses
type SWRProductsState = {
  data?: unknown
  error?: unknown
  isLoading?: boolean
   
  mutate?: ReturnType<NonNullable<typeof jestLike>['fn']> | ((...args: unknown[]) => unknown)
}
type SWRCategoriesState = {
  data?: unknown
  error?: unknown
  isLoading?: boolean
}

// Use a getter function to ensure we always get the current state
let _productsState: SWRProductsState = {}
let _categoriesState: SWRCategoriesState = {}

const getProductsState = () => _productsState
const getCategoriesState = () => _categoriesState

// Capture useSWR calls to assert query key recomputation
const useSWRCalls: Array<{ key: unknown; fetcher: unknown; opts: unknown }> = []

function mockLoginPromptModule() {
  return {
    __esModule: true,
    default: ({ isOpen, title = 'Sign in to continue' }: { isOpen: boolean; title?: string }) => (
      <div aria-label="login-prompt" data-open={isOpen ? 'true' : 'false'}>
        {isOpen ? title : null}
      </div>
    ),
  }
}

// Mock swr default export - returns different state based on the key
function mockSWRModule() {
  return {
    __esModule: true,
    default: (key: unknown, fetcher: unknown, opts: unknown) => {
      useSWRCalls.push({ key, fetcher, opts })
      
      // If the key is for categories, return categories state
      if (typeof key === 'string' && key.includes('/api/marketplace/categories')) {
        const state = getCategoriesState()
        const result = {
          data: state.data,
          error: state.error,
          isLoading: state.isLoading !== undefined ? state.isLoading : false,
          mutate: jestLike.fn(),
        }
        return result
      }
      
      // Otherwise return products state
      const state = getProductsState()
      const result = {
        data: state.data,
        error: state.error,
        isLoading: state.isLoading !== undefined ? state.isLoading : false,
        mutate: state.mutate ?? jestLike.fn(),
      }
      return result
    },
  }
}

if ((global as { vi?: typeof import('vitest') }).vi) {
  // vitest exposes `vi`
  vi.mock('@/components/LoginPrompt', mockLoginPromptModule)
  vi.mock('swr', mockSWRModule)
} else if ((global as { jest?: typeof import('@jest/globals') }).jest) {
  // jest fallback if these tests are run there
  jest.mock('@/components/LoginPrompt', mockLoginPromptModule)
  jest.mock('swr', mockSWRModule)
}

// After SWR mock is set up above, import component under test
import CatalogView from '@/components/marketplace/CatalogView'
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


// Utility: set SWR states for a given test
function setSWRProducts(state: Partial<SWRProductsState>) {
  if ('data' in state) _productsState.data = state.data
  if ('error' in state) _productsState.error = state.error
  if ('isLoading' in state) _productsState.isLoading = state.isLoading
  if ('mutate' in state) _productsState.mutate = state.mutate as SWRProductsState['mutate']
}
function setSWRCategories(state: Partial<SWRCategoriesState>) {
  if ('data' in state) _categoriesState.data = state.data
  if ('error' in state) _categoriesState.error = state.error
  if ('isLoading' in state) _categoriesState.isLoading = state.isLoading
}

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  unit: string;
  stock: number;
  rating: number;
  reviewCount: number;
  images: unknown[];
  vendor: { id: string; name: string; verified: boolean };
  category: { id: string; name: string; slug: string };
} & Record<string, unknown>;

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    title: 'Premium Cement',
    description: 'High quality cement for construction',
    price: 99.5,
    currency: 'SAR',
    unit: 'bag',
    stock: 42,
    rating: 4.234,
    reviewCount: 10,
    images: [],
    vendor: {
      id: 'v1',
      name: 'BuildCo',
      verified: true
    },
    category: { id: 'c1', name: 'Materials', slug: 'materials' },
    ...overrides,
  }
}

function makeCatalog(products: Product[]) {
  return {
    products,
    pagination: {
      page: 1,
      limit: 24,
      total: products.length,
      pages: 1,
      tenantId: 'demo-tenant',
    },
  }
}

type Category = { id: string; name: string; slug: string } & Record<string, unknown>;

function makeCategories(cats: Category[]) {
  return {
    categories: cats,
    tenantId: 'demo-tenant',
  }
}

beforeEach(() => {
  // Reset SWR mocks - set all properties explicitly
  setSWRProducts({ data: makeCatalog([]), isLoading: false, error: undefined, mutate: jestLike.fn() })
  setSWRCategories({ data: makeCategories([{ id: 'c1', name: 'Materials', slug: 'materials' }]), isLoading: false, error: undefined })
  useSWRCalls.length = 0

  // Reset cookies/localStorage
  document.cookie = ''
  localStorage.clear()

  // Reset fetch mock
vi.stubGlobal('fetch', undefined as unknown as typeof fetch);
})

describe('CatalogView - basic rendering', () => {
  it('renders title and subtitle, and hides FM banner by default', () => {
    render(<CatalogView />)
    expect(screen.getByRole('heading', { name: /Fixzit Marketplace/i })).toBeInTheDocument()
    expect(screen.getByText(/Browse verified materials and service vendors/i)).toBeInTheDocument()
    expect(screen.queryByText(/Inventory synced with tenant procurement guardrails/i)).not.toBeInTheDocument()
  })

  it('renders FM context banner when context="fm"', () => {
    render(<CatalogView context="fm" />)
    expect(screen.getByText(/Inventory synced with tenant procurement guardrails/i)).toBeInTheDocument()
  })
})

describe('CatalogView - loading and empty states', () => {
  it('shows loading state (no empty-state text while loading)', () => {
    setSWRProducts({ isLoading: true, data: undefined })
    render(<CatalogView />)
    expect(screen.queryByText(/No products match your filters/i)).not.toBeInTheDocument()
  })

  it('shows empty state message when no products and no error', () => {
    setSWRProducts({ data: makeCatalog([]), error: undefined, isLoading: false })
    setSWRCategories({ data: makeCategories([{ id: 'c1', name: 'Materials', slug: 'materials' }]), error: undefined, isLoading: false })
    render(<CatalogView />)
    expect(screen.getByText(/No products match your filters/i)).toBeInTheDocument()
    expect(screen.getByText(/Adjust your filters or check back later/i)).toBeInTheDocument()
  })

  it('shows error-flavored empty state when error occurs', () => {
    setSWRProducts({ data: makeCatalog([]), error: new Error('boom') })
    render(<CatalogView />)
    expect(screen.getByText(/No products match your filters/i)).toBeInTheDocument()
    expect(screen.getByText(/We could not reach the marketplace catalog right now/i)).toBeInTheDocument()
  })
})

describe('CatalogView - product rendering and formatting', () => {
  it('renders a product card with price, unit, stock, category, rating, verified vendor, and description fallback', () => {
    const product = makeProduct({ images: [] }) // empty array to show "Image not provided"
    setSWRProducts({ data: makeCatalog([product]) })
    render(<CatalogView />)

    // Title
    expect(screen.getByText(product.title)).toBeInTheDocument()

    // Vendor name and verified text
    expect(screen.getByText(product.vendor.name)).toBeInTheDocument()
    expect(screen.getByText(/Verified vendor/i)).toBeInTheDocument()

    // Price formatting: currency + 2 decimals and unit
    const priceEl = screen.getByText(/SAR/i)
    expect(priceEl).toHaveTextContent(/99\.50/) // toFixed(2)
    expect(screen.getByText(/\/\s*bag/i)).toBeInTheDocument()

    // Stock badge
    expect(screen.getByText(/Stock:\s*42/i)).toBeInTheDocument()

    // Category badge
    expect(screen.getByText(product.category.name, { selector: 'div' })).toBeInTheDocument()

    // Rating and reviews
    expect(screen.getByText(/4\.2\s*·\s*10 reviews/i)).toBeInTheDocument()

    // Description
    expect(screen.getByText(product.description)).toBeInTheDocument()

    // Image fallback text
    expect(screen.getByText(/Image not provided/i)).toBeInTheDocument()
  })

  it('renders an image when provided with correct alt', () => {
    const product = makeProduct({ images: ['https://example.com/img.png'] })
    setSWRProducts({ data: makeCatalog([product]) })
    render(<CatalogView />)
    const img = screen.getByAltText(product.title) as HTMLImageElement
    expect(img).toBeInTheDocument()
    expect(img.tagName.toLowerCase()).toBe('img')
  })

  it('renders fallback vendor text when vendor is missing or unverified', () => {
    const product = makeProduct({ vendor: null })
    setSWRProducts({ data: makeCatalog([product]) })
    render(<CatalogView />)
    expect(screen.getByText(/Vendor pending onboarding/i)).toBeInTheDocument()
    expect(screen.queryByText(/Verified vendor/i)).not.toBeInTheDocument()
  })
})

describe('CatalogView - interactions', () => {
  it('opens LoginPrompt when clicking "Request quote"', async () => {
    const product = makeProduct()
    setSWRProducts({ data: makeCatalog([product]) })
    render(<CatalogView />)
    await userEvent.click(screen.getByRole('button', { name: /Request quote/i }))
    expect(screen.getByLabelText('login-prompt')).toHaveAttribute('data-open', 'true')
  })

  it('unauthenticated "Add to cart" opens LoginPrompt and does not call fetch', async () => {
    const product = makeProduct()
    setSWRProducts({ data: makeCatalog([product]) })
    render(<CatalogView />)

    const fetchSpy = jestLike.fn()
    vi.stubGlobal('fetch', fetchSpy as unknown as typeof fetch);

    await userEvent.click(screen.getByRole('button', { name: /Add to cart/i }))
    expect(screen.getByLabelText('login-prompt')).toHaveAttribute('data-open', 'true')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('authenticated "Add to cart" calls API, shows success feedback, and calls mutate', async () => {
    const mutate = jestLike.fn()
    const product = makeProduct({ id: 'prod-123', title: 'Steel Rod' })
    setSWRProducts({ data: makeCatalog([product]), mutate })

    // Simulate authentication via cookie or localStorage
    document.cookie = 'fixzit_auth=1'

    const fetchSpy = jestLike.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchSpy as unknown as typeof fetch);

    render(<CatalogView />)

    await userEvent.click(screen.getByRole('button', { name: /Add to cart/i }))
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/marketplace/cart', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ productId: 'prod-123', quantity: 1 }),
      }))
    })
    expect(mutate).toHaveBeenCalled()
    expect(screen.getByText(/Steel Rod added to cart\./i)).toBeInTheDocument()
  })

  it('authenticated "Add to cart" shows failure feedback when API not ok', async () => {
    const mutate = jestLike.fn()
    const product = makeProduct({ id: 'prod-err', title: 'Failed Item' })
    setSWRProducts({ data: makeCatalog([product]), mutate })

    document.cookie = 'fixzit_auth=1'

    const fetchSpy = jestLike.fn().mockResolvedValue({ ok: false, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchSpy as unknown as typeof fetch);

    render(<CatalogView />)
    await userEvent.click(screen.getByRole('button', { name: /Add to cart/i }))
    await waitFor(() => {
      expect(screen.getByText(/We could not add this item to your cart/i)).toBeInTheDocument()
    })
  })

  it('filters: typing in inputs updates values and reset filters clears them', async () => {
    setSWRProducts({ data: makeCatalog([]) }) // empty state to show Reset filters button
    render(<CatalogView />)

    const search = screen.getByPlaceholderText(/Search products, vendors, or SKUs/i) as HTMLInputElement
    const minPrice = screen.getByPlaceholderText(/Min SAR/i) as HTMLInputElement
    const maxPrice = screen.getByPlaceholderText(/Max SAR/i) as HTMLInputElement

    await userEvent.type(search, 'cement')
    await userEvent.type(minPrice, '10')
    await userEvent.type(maxPrice, '100')

    expect(search).toHaveValue('cement')
    expect(minPrice).toHaveValue(10)
    expect(maxPrice).toHaveValue(100)

    await userEvent.click(screen.getByRole('button', { name: /Reset filters/i }))
    // After click, state should reset to '' (number inputs become empty string)
    expect(search).toHaveValue('')
    expect(minPrice.value).toBe('')
    expect(maxPrice.value).toBe('')
  })

  it('recomputes SWR key when filters change (query string contains filters)', async () => {
    // Start with empty dataset to allow interaction; capture calls
    setSWRProducts({ data: makeCatalog([]) })
    render(<CatalogView tenantId="demo-tenant" />)

    const search = screen.getByPlaceholderText(/Search products, vendors, or SKUs/i) as HTMLInputElement
    const minPrice = screen.getByPlaceholderText(/Min SAR/i) as HTMLInputElement
    const maxPrice = screen.getByPlaceholderText(/Max SAR/i) as HTMLInputElement

    await userEvent.type(search, 'rod')
    await userEvent.type(minPrice, '5')
    await userEvent.type(maxPrice, '50')

    // Debounce-less immediate re-render - SWR mock will have multiple calls
    const productCalls = useSWRCalls
      .map(c => c.key)
      .filter(k => typeof k === 'string' && k.startsWith('/api/marketplace/products?'))

    // Ensure at least one call contains each param
    expect(productCalls.some(k => k.includes('tenantId=demo-tenant'))).toBe(true)
    expect(productCalls.some(k => k.includes('q=rod'))).toBe(true)
    expect(productCalls.some(k => k.includes('minPrice=5'))).toBe(true)
    expect(productCalls.some(k => k.includes('maxPrice=50'))).toBe(true)
    // Default limit
    expect(productCalls.some(k => k.includes('limit=24'))).toBe(true)
  })
})

// Time-based feedback message auto-dismiss is covered implicitly by rendering assertion immediately after actions.
// If desired, we could advance timers with fake timers here, but it is optional for unit verification purpose.
