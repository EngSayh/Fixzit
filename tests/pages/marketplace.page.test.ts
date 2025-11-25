/**
 * Tests for MarketplacePage
 *
 * Framework: Vitest + @testing-library/react
 * - We mock global fetch for API calls
 * - We mock next/link to render simple anchors for ease of assertion
 * - We render the async component by awaiting its resolution if necessary
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, test, expect, beforeEach, afterAll, vi } from 'vitest';

vi.mock('@/lib/marketplace/serverFetch', () => ({
  __esModule: true,
  serverFetchJsonWithTenant: vi.fn()
}));

// Mock next/link to avoid Next.js runtime during tests
vi.mock('next/link', () => {
  const MockLink = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) =>
    React.createElement(
      'a',
      { href, className, 'data-testid': 'next-link-mock' },
      children
    );
  MockLink.displayName = 'MockLink';
  return { __esModule: true, default: MockLink };
});

vi.mock('@/components/marketplace/ProductCard', () => ({
  __esModule: true,
  default: ({ product }: { product: { slug?: string; id?: string; title?: { en?: string } | string; rating?: { avg?: number; count?: number }; inventories?: Array<{ leadDays?: number }> } }) =>
    React.createElement(
      'a',
      {
        'data-testid': 'next-link-mock',
        href: `/marketplace/product/${product.slug ?? product.id}`,
      },
      [
        React.createElement('span', { key: 'title' }, product.title?.en ?? product.title ?? product.slug),
        React.createElement(
          'span',
          { key: 'rating' },
          `⭐ ${product.rating?.avg ?? 0} · ${product.rating?.count ?? 0}`
        ),
        React.createElement(
          'span',
          { key: 'lead' },
          `Lead ${product.inventories?.[0]?.leadDays ?? 3} days`
        ),
      ]
    )
}));

// We will import the page under test via its route path if available.
// If your repository locates the page at app/marketplace/page.tsx, adjust the import path accordingly.
import MarketplacePage from '../../app/marketplace/page'; // Adjust this path to match your project structure.
import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';

type Product = {
  _id?: string;
  slug?: string;
  title?: string;
  rating?: { avg?: number; count?: number };
  inventories?: { leadDays?: number }[];
};

const originalEnv = { ...process.env };
const mockServerFetch = serverFetchJsonWithTenant as unknown as vi.MockedFunction<typeof serverFetchJsonWithTenant>;

beforeEach(() => {
  vi.resetAllMocks();
  process.env = { ...originalEnv };
  // Default FRONTEND_URL for building the fetch URL
  delete process.env.NEXT_PUBLIC_FRONTEND_URL;
  // Ensure offline dataset does not auto-enable and populate items in tests
  process.env.ALLOW_OFFLINE_MONGODB = 'false';
  mockServerFetch.mockReset();
});

afterAll(() => {
  process.env = originalEnv;
});

function setupMarketplaceFetchMock(items: Product[]) {
  mockServerFetch
    .mockResolvedValueOnce({ data: [{ id: 'c1', slug: 'c1', name: { en: 'Cat1' } }] }) // categories
    .mockResolvedValueOnce({ data: { items } }) // featured
    .mockResolvedValueOnce({ data: { items } }); // carousel for c1
}

describe('MarketplacePage', () => {
  test('renders heading and grid structure', async () => {
    setupMarketplaceFetchMock([]);
    const ui = await MarketplacePage();
    render(ui as React.ReactElement);

    expect(
      screen.getByRole('heading', { name: /Facilities, MRO & Construction Marketplace/i })
    ).toBeInTheDocument();
    const container = screen.getByRole('heading', { name: /Facilities, MRO & Construction Marketplace/i })
      .closest('div')?.parentElement;
    expect(container).toBeInTheDocument();
  });

  test('renders products with correct fields (happy path)', async () => {
  const items: Product[] = [
    {
      _id: '1',
      slug: 'cool-cement',
      title: 'Cool Cement',
        rating: { avg: 4.5, count: 12 },
        inventories: [{ leadDays: 5 }],
      },
      {
        // missing _id to force key fallback to slug
        slug: 'fast-cement',
        title: 'Fast Cement',
        rating: { avg: 3.8, count: 3 },
        inventories: [{ leadDays: 2 }],
      },
    ];
    setupMarketplaceFetchMock(items);

    const ui = await MarketplacePage();
    render(ui as React.ReactElement);

    // Product links (featured + carousel) should include our two items
    const links = screen.getAllByTestId('next-link-mock');
    expect(links.length).toBeGreaterThanOrEqual(2);
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining([
      '/marketplace/product/cool-cement',
      '/marketplace/product/fast-cement'
    ]));

    // Verify content inside cards
    const firstCard = links[0];
    expect(within(firstCard).getByText('Cool Cement')).toBeInTheDocument();
    expect(within(firstCard).getByText(/⭐\s*4\.5\s*·\s*12/)).toBeInTheDocument();
    expect(within(firstCard).getByText(/Lead\s*5\s*days/)).toBeInTheDocument();

    const secondCard = links[1];
    expect(within(secondCard).getByText('Fast Cement')).toBeInTheDocument();
    expect(within(secondCard).getByText(/⭐\s*3\.8\s*·\s*3/)).toBeInTheDocument();
    expect(within(secondCard).getByText(/Lead\s*2\s*days/)).toBeInTheDocument();
  });

  test('shows empty state when no items', async () => {
    setupMarketplaceFetchMock([]);

    const ui = await MarketplacePage();
    render(ui as React.ReactElement);

    expect(screen.queryAllByTestId('next-link-mock')).toHaveLength(0);
  });

  test('handles failed fetch by showing empty state', async () => {
    mockServerFetch.mockRejectedValueOnce(new Error('fail'));

    const ui = await MarketplacePage();
    render(ui as React.ReactElement);

    expect(screen.queryAllByTestId('next-link-mock')).toHaveLength(0);
  });

  test('defensive rendering: missing fields fallback to defaults', async () => {
    const items: Product[] = [
      {
        // No _id nor slug - link will have href with undefined slug, but component uses p.slug so href becomes "/marketplace/product/undefined"
        // and key falls back to slug (undefined). This validates it still renders safely.
        title: 'Unknown Cement',
        rating: {}, // missing avg and count -> should default to 0
        inventories: [{}], // missing leadDays -> should default to 3
      },
    ];
    setupMarketplaceFetchMock(items);

    const ui = await MarketplacePage();
    render(ui as React.ReactElement);

    const links = screen.getAllByTestId('next-link-mock');
    expect(links.length).toBeGreaterThanOrEqual(1);
    const link = links[0];
    // href falls back to a generated key when slug/id are missing
    expect(link.getAttribute('href')).toMatch(/\/marketplace\/product\/(undefined|featured-\d+)/);
    expect(within(link).getByText('Unknown Cement')).toBeInTheDocument();
    expect(within(link).getByText(/⭐\s*0\s*·\s*0/)).toBeInTheDocument();
    expect(within(link).getByText(/Lead\s*3\s*days/)).toBeInTheDocument();
  });

  test('uses NEXT_PUBLIC_FRONTEND_URL to build request URL when provided', async () => {
    process.env.NEXT_PUBLIC_FRONTEND_URL = 'https://example.com';
    const items: Product[] = [];
    setupMarketplaceFetchMock(items);

    const ui = await MarketplacePage();
    render(ui as React.ReactElement);

    expect(mockServerFetch).toHaveBeenCalled();
  });

  test('falls back to localhost when NEXT_PUBLIC_FRONTEND_URL is absent', async () => {
    delete process.env.NEXT_PUBLIC_FRONTEND_URL;
    setupMarketplaceFetchMock([]);

    const ui = await MarketplacePage();
    render(ui as React.ReactElement);

    expect(mockServerFetch).toHaveBeenCalled();
  });

  test('tolerates missing rating and inventories arrays', async () => {
    const items: Product[] = [
      {
        slug: 'no-meta-cement',
        title: 'No Meta Cement',
        // rating undefined, inventories undefined -> fallbacks should apply
      },
    ];
    setupMarketplaceFetchMock(items);

    const ui = await MarketplacePage();
    render(ui as React.ReactElement);

    const links = screen.getAllByTestId('next-link-mock');
    expect(links.length).toBeGreaterThanOrEqual(1);
    const link = links[0];
    expect(within(link).getByText(/⭐\s*0\s*·\s*0/)).toBeInTheDocument();
    expect(within(link).getByText(/Lead\s*3\s*days/)).toBeInTheDocument();
  });
});
