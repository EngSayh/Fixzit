/**
 * Tests for app/marketplace/rfq/page.tsx (MarketplaceRFQPage)
 * Framework: Vitest
 * Libraries: @testing-library/react, @testing-library/jest-dom
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock useSWR to fully control data/loading/error states
vi.mock('swr', () => ({
  __esModule: true,
  default: vi.fn()
}))

// Mock child UI components to keep tests focused on logic and surface text
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div data-testid="Card" className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div data-testid="CardContent" className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div data-testid="CardHeader" className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <div data-testid="CardTitle" className={className}>{children}</div>,
}))
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => <span data-testid="Badge" data-variant={variant} className={className}>{children}</span>,
}))
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, className, onClick, variant }: any) => <button data-testid="Button" data-variant={variant} className={className} onClick={onClick}>{children}</button>,
}))
vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, className }: any) => (
    <input
      data-testid="Input"
      className={className}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  ),
}))
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select data-testid="Select" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}))
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => (open ? <div data-testid="Dialog" onClick={() => onOpenChange?.(false)}>{children}</div> : null),
  DialogContent: ({ children, className }: any) => <div data-testid="DialogContent" className={className}>{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="DialogHeader">{children}</div>,
  DialogTitle: ({ children, className }: any) => <div data-testid="DialogTitle" className={className}>{children}</div>,
}))
vi.mock('@/components/LoginPrompt', () => ({
  __esModule: true,
  default: ({ isOpen }: any) => (isOpen ? <div data-testid="LoginPrompt">Login Prompt</div> : null),
}))

// Lucide icons - harmless to render, but we can stub as spans to simplify
vi.mock('lucide-react', () => new Proxy({}, {
  get: (_target, prop: string) => (props: any) => <span data-icon={prop} {...props} />
}))

// Import after mocks
import useSWR from 'swr'
import MarketplaceRFQPage from './page'

type RFQItem = {
  id: string;
  code: string;
  title: string;
  description: string;
  category?: string;
  status: string;
  location?: { city?: string | null } | null;
  budget?: { estimated?: number | null; currency?: string | null } | null;
  timeline?: { bidDeadline?: string | null; startDate?: string | null; completionDate?: string | null } | null;
  bidding?: { targetBids?: number | null; maxBids?: number | null; anonymous?: boolean | null } | null;
  bidsCount: number;
}

type RFQResponse = {
  items: RFQItem[];
  pagination: {
    page: number; limit: number; total: number; pages: number; tenantId: string;
  };
}

const mockedUseSWR = useSWR as unknown as ReturnType<typeof vi.fn>

const makeResponse = (items: RFQItem[] = []): RFQResponse => ({
  items,
  pagination: { page: 1, limit: 24, total: items.length, pages: 1, tenantId: 'demo-tenant' }
})

const sampleRFQs: RFQItem[] = [
  {
    id: '1',
    code: 'RFQ-001',
    title: 'HVAC Maintenance',
    description: 'Maintain HVAC units across multiple sites.',
    category: 'HVAC',
    status: 'BIDDING',
    location: { city: 'Riyadh' },
    budget: { estimated: 50000, currency: 'SAR' },
    timeline: {
      bidDeadline: '2025-12-31',
      startDate: '2026-01-15',
      completionDate: '2026-03-01'
    },
    bidding: { targetBids: 5, maxBids: 10, anonymous: true },
    bidsCount: 2
  },
  {
    id: '2',
    code: 'RFQ-002',
    title: 'Electrical Upgrade',
    description: 'Upgrade electrical systems in HQ.',
    category: 'Electrical',
    status: 'PUBLISHED',
    location: { city: null },
    budget: { estimated: null, currency: 'SAR' },
    timeline: {
      bidDeadline: null,
      startDate: null,
      completionDate: null
    },
    bidding: { targetBids: null, maxBids: null, anonymous: false },
    bidsCount: 0
  },
]

beforeEach(() => {
  vi.resetModules()
  mockedUseSWR.mockReset()
  // Default mock returns loaded state with data
  mockedUseSWR.mockReturnValue({
    data: makeResponse(sampleRFQs),
    error: undefined,
    isLoading: false,
  })
})

describe('MarketplaceRFQPage - loading and error states', () => {
  test('renders loading spinner when isLoading', () => {
    mockedUseSWR.mockReturnValue({ data: undefined, error: undefined, isLoading: true })
    render(<MarketplaceRFQPage />)
    expect(screen.getByTestId('Card') || screen.getByText(/Open Requests for Quote/)).toBeInTheDocument()
    // Loader2 icon is mocked; look for element with data-icon="Loader2"
    expect(screen.getByRole('img', { hidden: true })).not.toBeInTheDocument()
    expect(screen.getByText((content, el) =>
      el?.getAttribute('data-icon') === 'Loader2'
    )).toBeInTheDocument()
  })

  test('renders error card when error is present', () => {
    mockedUseSWR.mockReturnValue({ data: undefined, error: new Error('fail'), isLoading: false })
    render(<MarketplaceRFQPage />)
    expect(screen.getByText('We could not reach the RFQ board.')).toBeInTheDocument()
    expect(screen.getByText(/Please refresh the page/)).toBeInTheDocument()
  })

  test('renders "No RFQs" card when data has no items', () => {
    mockedUseSWR.mockReturnValue({ data: makeResponse([]), error: undefined, isLoading: false })
    render(<MarketplaceRFQPage />)
    expect(screen.getByText('No RFQs match your filters')).toBeInTheDocument()
    expect(screen.getByText(/Clear your filters/)).toBeInTheDocument()
  })
})

describe('MarketplaceRFQPage - list rendering and formatting', () => {
  test('renders list with RFQ cards and key fields', () => {
    render(<MarketplaceRFQPage />)
    // Titles and codes
    expect(screen.getByText('HVAC Maintenance')).toBeInTheDocument()
    expect(screen.getByText('RFQ-001')).toBeInTheDocument()
    expect(screen.getByText('Electrical Upgrade')).toBeInTheDocument()
    expect(screen.getByText('RFQ-002')).toBeInTheDocument()

    // Categories: explicit and fallback
    expect(screen.getAllByTestId('Badge').map(n => n.textContent)).toEqual(
      expect.arrayContaining(['RFQ-001', 'RFQ-002'])
    )
    expect(screen.getByText('HVAC')).toBeInTheDocument()
    expect(screen.getByText('Electrical')).toBeInTheDocument()

    // Locations: city or 'Kingdom-wide'
    expect(screen.getByText('Riyadh')).toBeInTheDocument()
    expect(screen.getByText('Kingdom-wide')).toBeInTheDocument()

    // Bid deadline formatting
    expect(screen.getByText(/Bid deadline:/)).toBeInTheDocument()
    // non-null date shows localized value (we won't assert exact locale string; rely on presence)
    expect(screen.getAllByText(/Bid deadline:/).length).toBeGreaterThan(0)

    // Bids count
    expect(screen.getByText(/2 bids received/)).toBeInTheDocument()
    expect(screen.getByText(/0 bids received/)).toBeInTheDocument()
  })

  test('status badge applies appropriate text content', () => {
    render(<MarketplaceRFQPage />)
    // Status is lowercased in the badge content
    expect(screen.getAllByTestId('Badge').map(n => n.textContent)).toEqual(
      expect.arrayContaining(['bidding', 'published'])
    )
  })

  test('budget shows currency/amount or Confidential', () => {
    render(<MarketplaceRFQPage />)
    expect(screen.getByText(/SAR 50,000/)).toBeInTheDocument()
    expect(screen.getAllByText('Confidential').length).toBeGreaterThan(0)
  })
})

describe('MarketplaceRFQPage - filters update the SWR key (query string)', () => {
  test('typing search updates SWR key', async () => {
    const returns: any[] = []
    mockedUseSWR.mockImplementation((key: any, _fetcher: any, _opts: any) => {
      returns.push(key)
      // Always return stable data
      return { data: makeResponse(sampleRFQs), error: undefined, isLoading: false }
    })

    render(<MarketplaceRFQPage />)
    const input = screen.getByPlaceholderText('Search RFQs by title, code, or scope')
    fireEvent.change(input, { target: { value: 'hvac' } })

    // Let React re-render and SWR get re-invoked
    await waitFor(() => {
      const lastKey = returns[returns.length - 1] as string
      expect(lastKey).toContain('/api/public/rfqs?')
      expect(lastKey).toContain('tenantId=')
      expect(lastKey).toContain('limit=24')
      expect(lastKey).toContain('search=hvac')
    })
  })

  test('changing selects appends category, city and status params', async () => {
    const keys: string[] = []
    mockedUseSWR.mockImplementation((key: any) => {
      keys.push(key)
      return { data: makeResponse(sampleRFQs), error: undefined, isLoading: false }
    })

    render(<MarketplaceRFQPage />)

    // Category
    fireEvent.change(screen.getAllByTestId('Select')[0], { target: { value: 'Plumbing' } })
    // City
    const cityInput = screen.getByPlaceholderText('City')
    fireEvent.change(cityInput, { target: { value: 'Jeddah' } })
    // Status
    fireEvent.change(screen.getAllByTestId('Select')[1], { target: { value: 'CLOSED' } })

    await waitFor(() => {
      const lastKey = keys[keys.length - 1] || ''
      expect(lastKey).toContain('category=Plumbing')
      expect(lastKey).toContain('city=Jeddah')
      expect(lastKey).toContain('status=CLOSED')
    })
  })
})

describe('MarketplaceRFQPage - interactions: View details, Submit bid, LoginPrompt', () => {
  test('clicking "View details" opens dialog with details, closing hides it', async () => {
    render(<MarketplaceRFQPage />)

    const viewButtons = screen.getAllByRole('button', { name: 'View details' })
    expect(viewButtons.length).toBeGreaterThan(0)

    // Open dialog for first RFQ
    fireEvent.click(viewButtons[0])

    // Dialog content should show details from selected RFQ
    const dialog = await screen.findByTestId('Dialog')
    expect(within(dialog).getByText('HVAC Maintenance')).toBeInTheDocument()
    expect(within(dialog).getByText('RFQ-001')).toBeInTheDocument()

    // Timeline panel renders formatted TBD when null values appear; our first item has dates
    expect(within(dialog).getByText(/Target bids:/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Max bids:/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Anonymous review:/)).toBeInTheDocument()

    // Close dialog by triggering onOpenChange(false) via click on wrapper
    fireEvent.click(dialog)
    await waitFor(() => {
      expect(screen.queryByTestId('Dialog')).not.toBeInTheDocument()
    })
  })

  test('clicking "Post your RFQ" or "Submit bid" shows LoginPrompt', async () => {
    render(<MarketplaceRFQPage />)

    // Header CTA
    fireEvent.click(screen.getByRole('button', { name: 'Post your RFQ' }))
    expect(await screen.findByTestId('LoginPrompt')).toBeInTheDocument()

    // Close by re-rendering with state change through onClose
    // Our mocked prompt doesn't expose onClose; trigger the "Submit bid" which sets same state
    fireEvent.click(screen.getAllByRole('button', { name: 'Submit bid' })[0])
    // Still visible
    expect(await screen.findByTestId('LoginPrompt')).toBeInTheDocument()
  })
})

describe('MarketplaceRFQPage - date formatting edge cases', () => {
  test('shows TBD for invalid or missing dates in cards and dialog', async () => {
    const invalidRFQ: RFQItem = {
      id: 'x',
      code: 'RFQ-XXX',
      title: 'Bad Dates',
      description: 'Testing invalid dates',
      category: undefined,
      status: 'CLOSED',
      location: { city: 'Dammam' },
      budget: { estimated: 1000, currency: 'SAR' },
      timeline: {
        bidDeadline: 'not-a-date',
        startDate: null,
        completionDate: undefined
      },
      bidding: { targetBids: null, maxBids: null, anonymous: null },
      bidsCount: 1
    }
    mockedUseSWR.mockReturnValue({
      data: makeResponse([invalidRFQ]),
      error: undefined,
      isLoading: false,
    })

    render(<MarketplaceRFQPage />)

    // Card shows Bid deadline: TBD
    expect(screen.getByText(/Bid deadline: TBD/)).toBeInTheDocument()

    // Open details
    fireEvent.click(screen.getByRole('button', { name: 'View details' }))
    const dialog = await screen.findByTestId('Dialog')

    expect(within(dialog).getByText(/Bid deadline: TBD/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Expected start: TBD/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Completion: TBD/)).toBeInTheDocument()
  })
})

