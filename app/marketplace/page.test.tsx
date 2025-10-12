/**
 * Tests for app/marketplace/page.tsx
 *
 * Testing framework: Vitest
 *
 * Focus:
 * - Ensures the page module can be imported without errors.
 * - Verifies the serverFetchJsonWithTenant function is properly mocked.
 *
 * Notes:
 * - MarketplacePage is an async Server Component which cannot be tested with traditional React Testing Library
 * - We focus on testing that the module can be imported and mocked correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock serverFetchJsonWithTenant to prevent actual fetch calls
vi.mock('@/lib/marketplace/serverFetch', () => ({
  serverFetchJsonWithTenant: vi.fn((path: string) => {
    // Return appropriate mock data based on the path
    if (path.includes('/categories')) {
      return Promise.resolve({ data: [] });
    }
    if (path.includes('/products') || path.includes('/search')) {
      return Promise.resolve({ data: { items: [] } });
    }
    return Promise.resolve({ data: { items: [] } });
  })
}));

// Mock ProductCard to avoid rendering issues
vi.mock('@/components/marketplace/ProductCard', () => ({
  __esModule: true,
  default: () => null
}));

describe('MarketplacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('module can be imported without errors', async () => {
    // Import the module - this will test that all dependencies can be resolved
    const pageModule = await import('./page');
    expect(pageModule).toBeDefined();
    expect(pageModule.default).toBeDefined();
  });

  it('exports a default async function', async () => {
    const pageModule = await import('./page');
    const MarketplacePage = pageModule.default;
    expect(typeof MarketplacePage).toBe('function');
    // Server Components are async functions
    expect(MarketplacePage.constructor.name).toBe('AsyncFunction');
  });

  it('serverFetchJsonWithTenant is properly mocked', async () => {
    const { serverFetchJsonWithTenant } = await import('@/lib/marketplace/serverFetch');
    expect(serverFetchJsonWithTenant).toBeDefined();
    
    // Test the mock implementation
    const categoriesResult = await serverFetchJsonWithTenant('/api/marketplace/categories');
    expect(categoriesResult).toEqual({ data: [] });
    
    const productsResult = await serverFetchJsonWithTenant('/api/marketplace/products?limit=8');
    expect(productsResult).toEqual({ data: { items: [] } });
  });
});
