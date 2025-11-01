import { vi } from 'vitest';
/**
 * @file Marketplace homepage test
 * @description Verifies Marketplace page rendering with mocked server data fetch
 * Testing framework: Vitest
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock the server fetch utility
vi.mock('@/lib/marketplace/serverFetch', () => ({
  serverFetchJsonWithTenant: vi.fn().mockImplementation(async (url: string) => {
    if (url.includes('/api/marketplace/categories')) {
      return { data: [{ _id: 'cat1', slug: 'test-category', name: { en: 'Test Category' } }] };
    }
    if (url.includes('/api/marketplace/products')) {
      return { data: { items: [] } };
    }
    if (url.includes('/api/marketplace/search')) {
      return { data: { items: [] } };
    }
    return { data: [] };
  }),
}));

// Mock ProductCard component
vi.mock('@/components/marketplace/ProductCard', () => ({
  __esModule: true,
  default: ({ product }: { product: unknown }) => (
    <div data-testid="product-card">{JSON.stringify(product)}</div>
  ),
}));

// Import after mocks
// eslint-disable-next-line import/first
import MarketplacePage from './page';

describe('MarketplacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing and shows marketplace content', async () => {
    // MarketplacePage is an async server component, we need to await it
    const PageComponent = await MarketplacePage();
    render(PageComponent as React.ReactElement);
    
    // Wait for content to appear
    await waitFor(() => {
      expect(screen.getByText(/Fixzit Souq/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/Facilities, MRO & Construction Marketplace/i)).toBeInTheDocument();
  });

  it('uses semantic theme tokens (no hardcoded colors)', async () => {
    const PageComponent = await MarketplacePage();
    const { container } = render(PageComponent as React.ReactElement);
    
    // Verify NO hardcoded color classes exist
    const html = container.innerHTML;
    expect(html).not.toMatch(/bg-\[#[0-9A-Fa-f]{6}\]/); // No bg-[#RRGGBB]
    expect(html).not.toMatch(/text-\[#[0-9A-Fa-f]{6}\]/); // No text-[#RRGGBB]
    expect(html).not.toMatch(/border-\[#[0-9A-Fa-f]{6}\]/); // No border-[#RRGGBB]
    
    // Verify semantic tokens ARE used
    expect(html).toMatch(/bg-primary|text-primary|from-primary/);
    expect(html).toMatch(/bg-success|text-success/);
    expect(html).toMatch(/bg-warning|text-warning/);
  });

  it('displays Live Operational KPIs section', async () => {
    const PageComponent = await MarketplacePage();
    const { container } = render(PageComponent as React.ReactElement);
    
    await waitFor(() => {
      expect(screen.getByText(/Live Operational KPIs/i)).toBeInTheDocument();
    });
    
    // Check the KPIs are rendered (use getAllByText since labels may appear multiple times)
    const openApprovals = screen.getAllByText(/Open approvals/i);
    expect(openApprovals.length).toBeGreaterThan(0);
    
    const pendingDeliveries = screen.getAllByText(/Pending deliveries/i);
    expect(pendingDeliveries.length).toBeGreaterThan(0);
    
    // Verify semantic color classes are used
    expect(container.innerHTML).toMatch(/text-primary/);
    expect(container.innerHTML).toMatch(/text-success/);
    expect(container.innerHTML).toMatch(/text-warning/);
  });
});
