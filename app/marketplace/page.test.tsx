import { vi } from 'vitest';
/**
 * Tests for app/marketplace/page.tsx
 *
 * Testing framework: Jest
 * Testing library: React Testing Library (@testing-library/react) with @testing-library/jest-dom
 *
 * Focus:
 * - Ensures the page renders without errors.
 * - Verifies next/dynamic is called with { ssr: false }.
 * - Confirms the page renders the dynamic CatalogView placeholder (mock).
 *
 * Notes:
 * - We mock next/dynamic to avoid executing the dynamic import and to assert its call args.
 * - We do NOT execute the loader fn, avoiding the need to resolve path aliases (e.g., "@/").
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
// If the project does not have a global setup importing jest-dom, uncomment the next line:
// import '@testing-library/jest-dom';

const dynamicMock = vi.fn(() => {
  // Return a stub component; attach metadata for validation if needed
  const Stub: React.FC = () => <div data-testid="catalog-view-stub" />;
  // Preserve options for further assertions via the mock.calls array
  // Avoid invoking importer() to keep test fast and independent of module resolution
  return Stub;
});

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: dynamicMock,
}));

// Import after mocks so the module under test uses the mocked dynamic
// eslint-disable-next-line import/first
import MarketplacePage from './page';

describe('MarketplacePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing and shows the CatalogView stub', () => {
    render(<MarketplacePage />);
    expect(screen.getByTestId('catalog-view-stub')).toBeInTheDocument();
  });

  it('uses next/dynamic with SSR disabled', () => {
    // Import triggers dynamic() at module evaluation time; ensure it happened:
    // The mock should have been called exactly once to create CatalogView.
    expect(dynamicMock).toHaveBeenCalledTimes(1);

    const callArgs = dynamicMock.mock.calls[0] as unknown as [() => Promise<unknown>, { ssr: boolean }];
    expect(callArgs).toBeDefined();
    
    const [_importer, options] = callArgs;

    // Validate options structure
    expect(options).toBeDefined();
    expect(options.ssr).toBe(false);

    // Sanity: importer should be a function (lazy loader)
    expect(typeof _importer).toBe('function');
  });

  it('consistently renders the dynamic component on re-render', () => {
    const { rerender } = render(<MarketplacePage />);
    expect(screen.getByTestId('catalog-view-stub')).toBeInTheDocument();

    rerender(<MarketplacePage />);
    // The stub remains visible; dynamic() is not re-invoked because it was called at module init
    expect(dynamicMock).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId('catalog-view-stub').length).toBeGreaterThan(0);
  });
});
