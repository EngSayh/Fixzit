import { vi } from 'vitest';
/**
 * Test framework: Vitest + React Testing Library
 * These tests validate:
 *  - Dynamic import usage with ssr: false via mocking next/dynamic
 *  - Prop forwarding to CatalogView (title, subtitle, context)
 *  - Component render sanity (no crash)
 *
 * Conventions:
 *  - Mock next/dynamic to capture options and return a pass-through component wrapper.
 *  - Mock CatalogView to render a simple element exposing received props for assertions.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

type DynamicLoaderResult =
  | { default?: React.ComponentType<Record<string, unknown>> }
  | React.ComponentType<Record<string, unknown>>;
type DynamicLoader = () => Promise<DynamicLoaderResult> | DynamicLoaderResult;
type DynamicOptions = { ssr?: boolean };

// We'll capture the options passed to next/dynamic to assert ssr: false
const dynamicCalls: Array<{ loader: DynamicLoader; options?: DynamicOptions }> = [];

// Mock next/dynamic to record calls and return a simple wrapper component
vi.mock('next/dynamic', () => {
  return (loader: DynamicLoader, options?: DynamicOptions) => {
    dynamicCalls.push({ loader, options });
    // Simulate a "loaded" component by immediately using the mocked module
    // The loader returns a promise resolving to a module with default export.
    // For our tests, we will separately mock the imported module so that when invoked,
    // the returned component is our mock.
    // Here we return a component that defers to the resolved default from the loader.
    const DynamicWrapper = (props: Record<string, unknown>) => {
      const [Comp, setComp] =
        React.useState<React.ComponentType<Record<string, unknown>> | null>(null);
      React.useEffect(() => {
        Promise.resolve()
          .then(() => loader())
          .then((mod) => {
            if (typeof mod === 'function') {
              setComp(() => mod as React.ComponentType<Record<string, unknown>>);
              return;
            }
            if (mod?.default) {
              setComp(() => mod.default as React.ComponentType<Record<string, unknown>>);
            }
          })
          .catch((error) => {
            console.error('Dynamic import error:', error);
          });
      }, []);
      if (!Comp) { return null; }
      return <Comp {...props} />;
    };
    return DynamicWrapper;
  };
});

// Mock the dynamically imported CatalogView with a test double that surfaces props
vi.mock('@/components/marketplace/CatalogView', () => {
  const MockCatalogView = (props: Record<string, unknown>) => {
    const { title, subtitle, context } = props || {};
    return (
      <div data-testid="catalog-view">
        <span data-testid="cv-title">{String(title)}</span>
        <span data-testid="cv-subtitle">{String(subtitle)}</span>
        <span data-testid="cv-context">{String(context)}</span>
      </div>
    );
  };
  return { __esModule: true, default: MockCatalogView };
});

// Import after mocks to ensure component uses mocked dependencies
import MarketplacePage from '@/app/fm/marketplace/page';

describe('MarketplacePage', () => {
  beforeEach(() => {
    // Clear previous records
    dynamicCalls.length = 0;
  });

  it('renders without crashing', async () => {
    render(<MarketplacePage />);
    // since our dynamic mock defers mounting to next tick, wait for the mock to appear
    const el = await screen.findByTestId('catalog-view');
    expect(el).toBeInTheDocument();
  });

  it('passes the correct props to CatalogView', async () => {
    render(<MarketplacePage />);
    expect(await screen.findByTestId('cv-title')).toHaveTextContent('Marketplace Catalog');
    expect(screen.getByTestId('cv-subtitle')).toHaveTextContent(
      'Sourcing-ready catalog aligned with tenant approvals and procurement controls'
    );
    expect(screen.getByTestId('cv-context')).toHaveTextContent('fm');
  });

  it('uses next/dynamic with ssr disabled', async () => {
    // Render to trigger dynamic() call capture
    render(<MarketplacePage />);
    // Wait until dynamic component resolves
    await screen.findByTestId('catalog-view');

    // Validate that dynamic was called with { ssr: false }
    // At least one call expected; check last call for options
    expect(dynamicCalls.length).toBeGreaterThan(0);
    const { options } = dynamicCalls[dynamicCalls.length - 1] || {};
    expect(options).toBeDefined();
    expect(options).toHaveProperty('ssr', false);
  });

  it('loader function for dynamic import is a function and resolves a module', async () => {
    render(<MarketplacePage />);
    // ensure a call was recorded and loader is a function
    expect(dynamicCalls.length).toBeGreaterThan(0);
    const { loader } = dynamicCalls[0];
    expect(typeof loader).toBe('function');
    const mod = await loader();
    // Our jest.mock returns a module with a default export function
    expect(mod).toBeDefined();
    expect(typeof (mod.default || mod)).toBe('function');
  });
});
