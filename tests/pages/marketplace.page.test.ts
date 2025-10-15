/**
 * Tests for MarketplacePage
 *
 * Assumed framework: Jest + @testing-library/react + TypeScript
 * - We mock global fetch for API calls
 * - We mock next/link to render simple anchors for ease of assertion
 * - We render the async component by awaiting its resolution if necessary
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';

// Mock next/link to avoid Next.js runtime during tests
vi.mock('next/link', () => {
  const MockLink = ({ href, className, children }: any) =>
    React.createElement(
      'a',
      { href, className, 'data-testid': 'next-link-mock' },
      children
    );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// We will import the page under test via its route path if available.
// If your repository locates the page at app/marketplace/page.tsx, adjust the import path accordingly.
// @ts-expect-error - Dynamic import for testing
import MarketplacePage from '../../app/marketplace/page'; // Adjust this path to match your project structure.

type Product = {
  _id?: string;
  slug?: string;
  title?: string;
  rating?: { avg?: number; count?: number };
  inventories?: { leadDays?: number }[];
};

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetAllMocks();
  process.env = { ...originalEnv };
  // Default FRONTEND_URL for building the fetch URL
  delete process.env.NEXT_PUBLIC_FRONTEND_URL;
});

afterAll(() => {
  process.env = originalEnv;
});

function mockFetchOk(data: any) {
  // @ts-expect-error
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => data,
  });
}

function mockFetchFail(status: number = 500) {
  // @ts-expect-error
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ error: 'failed' }),
  });
}

describe('MarketplacePage', () => {
  test('renders heading and grid structure', async () => {
    mockFetchOk({ items: [] });
    const ui = await MarketplacePage();
    render(ui as React.ReactElement);

    expect(screen.getByRole('heading', { name: /Fixzit Marketplace/i })).toBeInTheDocument();
    // Grid container should be present even with no items
    const container = screen.getByText(/Fixzit Marketplace/i).closest('div')?.parentElement;
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
    mockFetchOk({ items });

    const ui = await MarketplacePage();
    render(ui as React.ReactElement);

    // Two product links
    const links = screen.getAllByTestId('next-link-mock');
    expect(links).toHaveLength(2);
    // Verify hrefs
    expect(links[0]).toHaveAttribute('href', '/marketplace/product/cool-cement');
    expect(links[1]).toHaveAttribute('href', '/marketplace/product/fast-cement');

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
    mockFetchOk({ items: [] });

    const ui = await MarketplacePage();
    render(ui as React.ReactElement);

    expect(screen.getByText(/No products yet\. Seed the marketplace and refresh\./i)).toBeInTheDocument();
  });

  test('handles failed fetch by showing empty state', async () => {
    mockFetchFail(500);

    const ui = await MarketplacePage();
    render(ui as React.ReactElement);

    expect(screen.getByText(/No products yet\. Seed the marketplace and refresh\./i)).toBeInTheDocument();
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
    mockFetchOk({ items });

    const ui = await MarketplacePage();
    render(ui as React.ReactElement);

    const link = screen.getByTestId('next-link-mock');
    expect(link).toHaveAttribute('href', '/marketplace/product/undefined');
    expect(within(link).getByText('Unknown Cement')).toBeInTheDocument();
    expect(within(link).getByText(/⭐\s*0\s*·\s*0/)).toBeInTheDocument();
    expect(within(link).getByText(/Lead\s*3\s*days/)).toBeInTheDocument();
  });

  test('uses NEXT_PUBLIC_FRONTEND_URL to build request URL when provided', async () => {
    process.env.NEXT_PUBLIC_FRONTEND_URL = 'https://example.com';
    const items: Product[] = [];
    mockFetchOk({ items });

    const ui = await MarketplacePage();
    render(ui as React.ReactElement);

    // Verify fetch called with expected URL
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      'https://example.com/api/marketplace/search?q=cement'
    );
  });

  test('falls back to localhost when NEXT_PUBLIC_FRONTEND_URL is absent', async () => {
    delete process.env.NEXT_PUBLIC_FRONTEND_URL;
    mockFetchOk({ items: [] });

    const ui = await MarketplacePage();
    render(ui as React.ReactElement);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      'http://localhost:3000/api/marketplace/search?q=cement'
    );
  });

  test('tolerates missing rating and inventories arrays', async () => {
    const items: Product[] = [
      {
        slug: 'no-meta-cement',
        title: 'No Meta Cement',
        // rating undefined, inventories undefined -> fallbacks should apply
      },
    ];
    mockFetchOk({ items });

    const ui = await MarketplacePage();
    render(ui as React.ReactElement);

    const link = screen.getByTestId('next-link-mock');
    expect(within(link).getByText(/⭐\s*0\s*·\s*0/)).toBeInTheDocument();
    expect(within(link).getByText(/Lead\s*3\s*days/)).toBeInTheDocument();
  });
});