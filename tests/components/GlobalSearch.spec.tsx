import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/**
 * NOTE ON TESTING LIBRARY AND FRAMEWORK
 * These tests target React Testing Library in a jsdom environment and are compatible with
 * both Vitest and Jest. If the repository uses Vitest, keep "vi" globals; if Jest, replace
 * "vi" with "jest".
 */

// Mock next/navigation usePathname
vi.mock('next/navigation', () => {
  return {
    usePathname: vi.fn(),
  };
});

type Hit = { id: string; entity: string; title: string; subtitle?: string; href: string };

// Provide a controllable AbortController for testing abort behavior
class MockAbortController {
  public aborted = false;
  public signal: AbortSignal;
  constructor() {
    // Create a minimal compatible signal
    // @ts-expect-error minimal stub for test
    this.signal = { aborted: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), onabort: null };
  }
  abort() {
    // @ts-expect-error mutate test stub
    this.signal.aborted = true;
    this.aborted = true;
  }
}

describe('GlobalSearch', () => {
  let usePathnameMock: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    const mod = await import('next/navigation');
    usePathnameMock = mod.usePathname as unknown as ReturnType<typeof vi.fn>;
  });

  const originalFetch = global.fetch;
  const originalAbortController = global.AbortController;

  beforeEach(async () => {
    vi.useFakeTimers();
    // reset mocks
    vi.clearAllMocks();

    // default pathname
    usePathnameMock.mockReturnValue('/');

    // stub fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [] as Hit[],
    } as any);

    // stub AbortController
    // @ts-ignore
    global.AbortController = MockAbortController as any;
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    global.fetch = originalFetch as any;
    // @ts-ignore
    global.AbortController = originalAbortController as any;
  });

  async function renderComponent() {
    const mod = await import('../../src/components/GlobalSearch').catch(async () => {
      // Fallback: if component path differs, import from app/components or components
      try { return await import('../../components/GlobalSearch'); } catch {
        return await import('../../GlobalSearch');
      }
    });
    const Comp = (mod as any).default || (mod as any);
    return render(<Comp />);
  }

  function setInputValue(value: string) {
    const input = screen.getByRole('textbox', { name: /global search/i });
    fireEvent.change(input, { target: { value } });
    return input;
  }

  test('renders input with FM placeholder by default ("/")', async () => {
    usePathnameMock.mockReturnValue('/');
    await renderComponent();
    const input = screen.getByRole('textbox', { name: /global search/i });
    expect(input).toHaveAttribute('placeholder', 'Search Work Orders, Properties, Tenants…');
  });

  test('uses "aqar" placeholder when path starts with /aqar', async () => {
    usePathnameMock.mockReturnValue('/aqar/listings');
    await renderComponent();
    const input = screen.getByRole('textbox', { name: /global search/i });
    expect(input).toHaveAttribute('placeholder', 'Search listings, projects, agents…');
  });

  test('uses "souq" placeholder when path starts with /souq or /marketplace', async () => {
    usePathnameMock.mockReturnValue('/souq');
    await renderComponent();
    expect(screen.getByRole('textbox', { name: /global search/i })).toHaveAttribute(
      'placeholder',
      'Search catalog, vendors, RFQs, orders…'
    );

    // Re-render for /marketplace
    usePathnameMock.mockReturnValue('/marketplace/deals');
    await renderComponent();
    expect(screen.getAllByRole('textbox', { name: /global search/i })[1]).toHaveAttribute(
      'placeholder',
      'Search catalog, vendors, RFQs, orders…'
    );
  });

  test('does not fetch when query is empty or whitespace-only; clears hits', async () => {
    usePathnameMock.mockReturnValue('/');
    await renderComponent();

    // Focus opens the dropdown but there are no hits yet
    const input = screen.getByRole('textbox', { name: /global search/i });
    fireEvent.focus(input);

    // whitespace input
    setInputValue('   ');
    // flush microtasks
    await vi.waitFor(() => {});
    expect(global.fetch).not.toHaveBeenCalled();

    // No listbox because hits is []
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  test('fetches with correct app and q when query is provided (fm app)', async () => {
    usePathnameMock.mockReturnValue('/some/other');
    await renderComponent();

    setInputValue('test');
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const url = (global.fetch as any).mock.calls[0][0] as string;
    // URLSearchParams order is app then q for this implementation
    expect(url).toMatch(/^\/api\/search\?/);
    expect(url).toContain('app=fm');
    expect(url).toContain('q=test');
  });

  test('fetches with souq app when path is /marketplace and preserves spaces in q', async () => {
    usePathnameMock.mockReturnValue('/marketplace');
    await renderComponent();

    setInputValue('  hello world ');
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    const url = (global.fetch as any).mock.calls[0][0] as string;
    expect(url).toContain('app=souq');
    // URL encoding should include encoded spaces
    expect(decodeURIComponent(url)).toContain('q=  hello world ');
  });

  test('aborts previous in-flight request when typing a new query', async () => {
    usePathnameMock.mockReturnValue('/');
    await renderComponent();

    // First query triggers first AbortController
    setInputValue('abc');
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    // Capture the AbortController instance used on first call
    const firstInit = (global.fetch as any).mock.calls[0][1];
    const firstSignal = firstInit?.signal as AbortSignal & { aborted?: boolean };

    // Second query should abort previous
    setInputValue('abcd');
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    // The previous signal should be aborted
    expect(firstSignal?.aborted).toBe(true);
  });

  test('opens dropdown on focus and via Ctrl/Cmd+K; closes on blur after timeout', async () => {
    usePathnameMock.mockReturnValue('/');
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () =>
        [
          { id: '1', entity: 'wo', title: 'WO-1', subtitle: 'Work Order', href: '/wo/1' },
        ] as Hit[],
    });

    await renderComponent();
    const input = screen.getByRole('textbox', { name: /global search/i });

    // Focus should open
    fireEvent.focus(input);
    // Provide a query to populate hits
    setInputValue('w');
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    // With hits and open=true, listbox should render
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeInTheDocument());

    // Blur should close after 120ms
    fireEvent.blur(input);
    vi.advanceTimersByTime(119);
    expect(screen.queryByRole('listbox')).toBeInTheDocument(); // not yet closed
    vi.advanceTimersByTime(1);
    expect(screen.queryByRole('listbox')).toBeNull();

    // Keyboard shortcut should open
    const keyEvent = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    window.dispatchEvent(keyEvent);
    // Open but no hits since we cleared; still should not render listbox (requires hits > 0)
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  test('renders hits with correct structure when results are returned', async () => {
    usePathnameMock.mockReturnValue('/');
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () =>
        [
          { id: '1', entity: 'wo', title: 'WO-1', subtitle: 'Work Order', href: '/wo/1' },
          { id: '2', entity: 'prop', title: 'Property A', href: '/properties/2' },
        ] as Hit[],
    });

    await renderComponent();

    const input = screen.getByRole('textbox', { name: /global search/i });
    fireEvent.focus(input);
    setInputValue('wo');

    // Expect listbox rendered with two options
    const listbox = await screen.findByRole('listbox');
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(2);

    // First hit content
    expect(options[0]).toHaveAttribute('href', '/wo/1');
    expect(options[0]).toHaveTextContent('WO-1');
    expect(options[0]).toHaveTextContent('Work Order');
    expect(options[0]).toHaveTextContent('wo');

    // Second hit has no subtitle
    expect(options[1]).toHaveAttribute('href', '/properties/2');
    expect(options[1]).toHaveTextContent('Property A');
    expect(options[1]).toHaveTextContent('prop');
  });

  test('handles non-ok fetch responses without throwing and does not update hits', async () => {
    usePathnameMock.mockReturnValue('/');
    // First successful fetch to set hits
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: '1', entity: 'wo', title: 'WO-1', href: '/wo/1' }] as Hit[],
    });

    await renderComponent();
    const input = screen.getByRole('textbox', { name: /global search/i });
    fireEvent.focus(input);
    setInputValue('a');
    await screen.findByRole('listbox');

    // Next fetch returns non-ok; hits should remain as-is (catch is ignored)
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => [] as Hit[],
    });

    setInputValue('ab');
    // Wait a tick to process promise chain
    await vi.waitFor(() => {});
    // Still shows listbox with prior results
    expect(screen.queryByRole('listbox')).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('WO-1');
  });
});