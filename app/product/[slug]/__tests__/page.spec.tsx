/**
 * Testing library/framework: Jest + @testing-library/react.
 * If the repo uses Vitest instead, these tests should be compatible with minor adjustments (e.g., vi instead of jest).
 */

import React from &apos;react&apos;
import { render, screen, within } from &apos;@testing-library/react&apos;

// Next.js server components return JSX from an async function; we can await and then render the result.
import ProductPage from &apos;../page&apos;

// Mock next/link to render simple anchor for test environment
jest.mock(&apos;next/link&apos;, () => {
  return ({ href, className, children }: any) => <a href={href} className={className}>{children}</a>;
});

// Simple helper to set process env for tests
const withEnv = (key: string, value: string, fn: () => Promise<void> | void) => {
  const prev = process.env[key];
  process.env[key] = value;
  const maybePromise = fn();
  const restore = () => { if (prev === undefined) delete process.env[key]; else process.env[key] = prev; };
  if (maybePromise && typeof (maybePromise as any).then === &apos;function&apos;) {
    return (maybePromise as Promise<void>).finally(restore);
  } else {
    restore();
    return;
  }
};

describe(&apos;ProductPage&apos;, () => {
  const makeData = (overrides?: Partial<any>) => {
    const base = {
      product: {
        title: &apos;Acme Widget&apos;,
        attributes: Array.from({ length: 10 }).map((_, i) => ({ key: `K${i+1}`, value: `V${i+1}` })),
      },
      buyBox: {
        price: 1234.56,
        currency: &apos;USD&apos;,
        inStock: true,
        leadDays: 3,
      }
    };
    return { ...base, ...(overrides||{}) };
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test(&apos;renders Not found when product is missing&apos;, async () => {
    // Mock fetch to return data without product
    // @ts-expect-error - Mocking global fetch for testing
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ buyBox: { price: 1, currency: &apos;USD&apos;, inStock: false, leadDays: 10 } }),
    });

    const res = await ProductPage({ params: { slug: &apos;missing&apos; } });
    render(res as any);

    expect(screen.getByText(&apos;Not found&apos;)).toBeInTheDocument();
    // Ensure fetch called with correct URL default (no env set)
    expect(global.fetch).toHaveBeenCalledWith(
      &apos;http://localhost:3000/api/marketplace/products/missing&apos;,
      expect.objectContaining({ cache: &apos;no-store&apos; })
    );
  });

  test(&apos;renders title, attributes (max 6), price/currency, stock status, lead days, and action links&apos;, async () => {
    // @ts-expect-error - Mocking global fetch for testing
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => makeData(),
    });

    const res = await ProductPage({ params: { slug: &apos;acme-widget&apos; } });
    render(res as any);

    // Title
    expect(screen.getByRole(&apos;heading&apos;, { level: 1, name: &apos;Acme Widget&apos; })).toBeInTheDocument();

    // Attributes limited to 6, in order with "key: value"
    const list = screen.getByRole(&apos;list&apos;);
    const items = within(list).getAllByRole(&apos;listitem&apos;);
    expect(items).toHaveLength(6);
    expect(items[0]).toHaveTextContent(/^K1:\s*V1$/);
    expect(items[5]).toHaveTextContent(/^K6:\s*V6$/);

    // Price and currency
    // Using toLocaleString() means decimals and thousands may vary; check both parts loosely.
    const priceEl = screen.getByText(/USD$/);
    expect(priceEl).toHaveTextContent(&apos;USD&apos;);
    expect(priceEl.textContent).toMatch(/\d/);

    // Stock status + lead days
    expect(screen.getByText(/In Stock/)).toBeInTheDocument();
    expect(screen.getByText(/Lead 3 days/)).toBeInTheDocument();

    // Links
    const addToCart = screen.getByRole(&apos;link&apos;, { name: &apos;Add to Cart&apos; });
    expect(addToCart).toHaveAttribute(&apos;href&apos;, &apos;/cart&apos;);

    const buyNow = screen.getByRole(&apos;link&apos;, { name: &apos;Buy Now (PO)&apos; });
    expect(buyNow).toHaveAttribute(&apos;href&apos;, &apos;/orders/new?mode=buy-now&apos;);

    // fetch called with default base URL
    expect(global.fetch).toHaveBeenCalledWith(
      &apos;http://localhost:3000/api/marketplace/products/acme-widget&apos;,
      expect.objectContaining({ cache: &apos;no-store&apos; })
    );
  });

  test(&apos;uses NEXT_PUBLIC_FRONTEND_URL if set when fetching PDP&apos;, async () => {
    // @ts-expect-error - Mocking global fetch for testing
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => makeData(),
    });

    await withEnv(&apos;NEXT_PUBLIC_FRONTEND_URL&apos;, &apos;https://example.com&apos;, async () => {
      const res = await ProductPage({ params: { slug: &apos;env-based&apos; } });
      render(res as any);
      expect(global.fetch).toHaveBeenCalledWith(
        &apos;https://example.com/api/marketplace/products/env-based&apos;,
        expect.objectContaining({ cache: &apos;no-store&apos; })
      );
    });
  });

  test(&apos;renders Backorder when not in stock and shows correct lead days&apos;, async () => {
    // @ts-expect-error - Mocking global fetch for testing
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => makeData({ buyBox: { price: 99, currency: &apos;EUR&apos;, inStock: false, leadDays: 9 } }),
    });

    const res = await ProductPage({ params: { slug: &apos;backorder&apos; } });
    render(res as any);

    expect(screen.getByText(/Backorder/)).toBeInTheDocument();
    expect(screen.getByText(/Lead 9 days/)).toBeInTheDocument();

    const priceEl = screen.getByText(/EUR$/);
    expect(priceEl).toBeInTheDocument();
  });

  test(&apos;handles empty attributes array gracefully&apos;, async () => {
    // @ts-expect-error - Mocking global fetch for testing
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        product: { title: &apos;No Attrs&apos;, attributes: [] },
        buyBox: { price: 10, currency: &apos;USD&apos;, inStock: true, leadDays: 1 }
      }),
    });

    const res = await ProductPage({ params: { slug: &apos;no-attrs&apos; } });
    render(res as any);

    expect(screen.getByRole(&apos;heading&apos;, { name: &apos;No Attrs&apos; })).toBeInTheDocument();
    // UL exists but has no list items
    const list = screen.getByRole(&apos;list&apos;);
    expect(within(list).queryAllByRole(&apos;listitem&apos;)).toHaveLength(0);
  });

  test(&apos;tolerates missing buyBox gracefully (optional chaining)&apos;, async () => {
    // @ts-expect-error - Mocking global fetch for testing
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        product: { title: &apos;No BuyBox&apos;, attributes: [{ key: &apos;A', value: 'B' }] },
        buyBox: undefined
      }),
    });

    const res = await ProductPage({ params: { slug: &apos;no-bb&apos; } });
    render(res as any);

    // Should still render title and attributes; price/currency text may be incomplete due to undefined
    expect(screen.getByRole(&apos;heading&apos;, { name: &apos;No BuyBox&apos; })).toBeInTheDocument();
    const list = screen.getByRole(&apos;list&apos;);
    const items = within(list).getAllByRole(&apos;listitem&apos;);
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent(/^A:\s*B$/);

    // The price container exists in markup; but text might be "undefined undefined"
    // We assert the section exists to ensure component didn&apos;t crash.
    expect(screen.getByText(/About this item/)).toBeInTheDocument();
  });
});