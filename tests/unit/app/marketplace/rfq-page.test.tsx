/**
 * Tests for app/marketplace/rfq/page.tsx (MarketplaceRFQPage)
 * Updated to match server-side data fetching implementation.
 */
import { vi, describe, test, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/lib/marketplace/serverFetch', () => ({
  serverFetchJsonWithTenant: vi.fn()
}));

vi.mock('@/lib/i18n/server', () => ({
  getServerI18n: vi.fn().mockResolvedValue({
    t: (key: string, fallback?: string) => fallback ?? key
  })
}));

vi.mock('@/components/marketplace/RFQBoard', () => ({
  __esModule: true,
  default: ({
    categories,
    initialRfqs,
  }: {
    categories: Array<{ slug: string; name: Record<string, string> }>;
    initialRfqs: Array<{ title: string }>;
  }) => (
    <div data-testid="RFQBoard">
      <span data-testid="categories-count">{categories?.length ?? 0}</span>
      <span data-testid="rfqs-count">{initialRfqs?.length ?? 0}</span>
      <div data-testid="rfq-titles">{initialRfqs?.map((r) => r.title).join('|')}</div>
    </div>
  )
}));

import { serverFetchJsonWithTenant } from '@/lib/marketplace/serverFetch';
import MarketplaceRFQPage from '@/app/(app)/marketplace/rfq/page';

const mockServerFetch = serverFetchJsonWithTenant as unknown as ReturnType<typeof vi.fn>;

const sampleCategories = [
  { slug: 'hvac', name: { en: 'HVAC' } },
  { slug: 'electrical', name: { en: 'Electrical' } }
];

const sampleRfqs = [
  { id: '1', title: 'HVAC Upgrade', status: 'BIDDING', currency: 'SAR', createdAt: '2025-01-01' },
  { id: '2', title: 'Electrical Audit', status: 'PUBLISHED', currency: 'SAR', createdAt: '2025-02-01' }
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MarketplaceRFQPage - server data flow', () => {
  test('renders RFQBoard with categories and rfqs from server', async () => {
    mockServerFetch
      .mockResolvedValueOnce({ data: sampleCategories })
      .mockResolvedValueOnce({ data: sampleRfqs });

    const ui = await MarketplaceRFQPage();
    render(ui as React.ReactElement);

    expect(screen.getByTestId('RFQBoard')).toBeInTheDocument();
    expect(screen.getByTestId('categories-count')).toHaveTextContent('2');
    expect(screen.getByTestId('rfqs-count')).toHaveTextContent('2');
    expect(screen.getByTestId('rfq-titles')).toHaveTextContent('HVAC Upgrade');
    expect(screen.getByTestId('rfq-titles')).toHaveTextContent('Electrical Audit');

    expect(mockServerFetch).toHaveBeenNthCalledWith(1, '/api/marketplace/categories');
    expect(mockServerFetch).toHaveBeenNthCalledWith(2, '/api/marketplace/rfq');
  });

  test('renders error state when fetch fails', async () => {
    mockServerFetch.mockRejectedValueOnce(new Error('fail'));

    const ui = await MarketplaceRFQPage();
    render(ui as React.ReactElement);

    expect(
      screen.getByText('Failed to load RFQ data. Please try again later.')
    ).toBeInTheDocument();
  });
});
