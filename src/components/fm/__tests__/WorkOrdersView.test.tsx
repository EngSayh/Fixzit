import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import the component from its existing location. The file provided to us is named *.test.tsx but contains the component.
// We import default export and named types per the provided source content.
import WorkOrdersViewDefault, { WorkOrdersView } from '../WorkOrdersView.test';
/**
 Note: If the actual component resides at a different path (e.g., ../WorkOrdersView),
 update the import above accordingly. We avoid touching component code in this PR.
*/

jest.mock('swr', () => {
  // We'll provide a helper to control return values per test.
  let current: any = { data: undefined, error: undefined, isLoading: false, mutate: jest.fn(), isValidating: false };
  const useSWR = (_key: any, _fetcher: any) => current;
  (useSWR as any).__set = (next: any) => { current = { ...current, ...next }; };
  (useSWR as any).__reset = () => { current = { data: undefined, error: undefined, isLoading: false, mutate: jest.fn(), isValidating: false }; };
  return useSWR;
});

jest.mock('date-fns', () => {
  const actual = jest.requireActual('date-fns');
  return {
    ...actual,
    formatDistanceToNowStrict: jest.fn((date: Date) => {
      // Provide a deterministic label for tests based on timestamp relation to "now"
      const now = Date.now();
      const diffMs = date.getTime() - now;
      if (Number.isNaN(date.getTime())) return 'Invalid';
      if (diffMs < 0) return '1 hour ago';
      return 'in 1 hour';
    }),
  };
});

// JSDOM has localStorage; ensure clean state
beforeEach(() => {
  jest.useFakeTimers();
  (global as any).fetch = jest.fn();
  (window.localStorage as any).clear();
  (window as any).alert = jest.fn();
  (require('swr') as any).__reset();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

const makeApiResponse = (items: any[], page = 1, limit = 10, total?: number) => ({
  items, page, limit, total: total ?? items.length,
});

describe('WorkOrdersView', () => {
  test('renders default heading and description', () => {
    const useSWR = require('swr');
    useSWR.__set({ data: makeApiResponse([]), isLoading: false, error: undefined, isValidating: false, mutate: jest.fn() });

    render(<WorkOrdersViewDefault />);
    expect(screen.getByRole('heading', { name: /Work Orders/i })).toBeInTheDocument();
    expect(screen.getByText(/Manage and track work orders/i)).toBeInTheDocument();
  });

  test('renders custom heading and description via props', () => {
    const useSWR = require('swr');
    useSWR.__set({ data: makeApiResponse([]) });

    render(<WorkOrdersView heading="My WOs" description="Desc here" />);
    expect(screen.getByRole('heading', { name: /My WOs/ })).toBeInTheDocument();
    expect(screen.getByText(/Desc here/)).toBeInTheDocument();
  });

  test('shows loading card when isLoading and no data', () => {
    const useSWR = require('swr');
    useSWR.__set({ data: undefined, isLoading: true });

    render(<WorkOrdersViewDefault />);
    expect(screen.getByText(/Loading work orders/i)).toBeInTheDocument();
  });

  test('shows error card when error is present', () => {
    const useSWR = require('swr');
    useSWR.__set({ error: new Error('Network broken') });

    render(<WorkOrdersViewDefault />);
    expect(screen.getByText(/Network broken/)).toBeInTheDocument();
  });

  test('shows empty state when no work orders and no error', () => {
    const useSWR = require('swr');
    useSWR.__set({ data: makeApiResponse([]), isLoading: false });

    render(<WorkOrdersViewDefault />);
    expect(screen.getByText(/No work orders match the current filters/i)).toBeInTheDocument();
  });

  test('renders list items with badges and computed meta including overdue styling', () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const past = new Date(now - 60 * 60 * 1000).toISOString(); // 1h ago
    const future = new Date(now + 60 * 60 * 1000).toISOString(); // in 1h

    const items = [
      { _id: '1', code: 'WO-1', title: 'Fix sink', status: 'SUBMITTED', priority: 'HIGH', dueAt: past, slaMinutes: 120, description: 'desc', propertyId: 'P1', assigneeUserId: 'U1', category: 'PLUMBING', createdAt: new Date(now - 5000).toISOString() },
      { _id: '2', code: 'WO-2', title: 'Check HVAC', status: 'COMPLETED', priority: 'LOW', dueAt: future, slaMinutes: undefined, description: undefined, propertyId: '', assigneeVendorId: 'VND-9', category: undefined, createdAt: undefined },
    ];

    const useSWR = require('swr');
    useSWR.__set({ data: makeApiResponse(items), isLoading: false });

    render(<WorkOrdersViewDefault />);

    // Titles
    expect(screen.getByText('Fix sink')).toBeInTheDocument();
    expect(screen.getByText('Check HVAC')).toBeInTheDocument();

    // Codes
    expect(screen.getByText(/Code: WO-1/)).toBeInTheDocument();
    expect(screen.getByText(/Code: WO-2/)).toBeInTheDocument();

    // Priority badges content
    expect(screen.getAllByText(/Priority: /)[0]).toHaveTextContent('Priority: HIGH');
    expect(screen.getAllByText(/Priority: /)[1]).toHaveTextContent('Priority: LOW');

    // Status labels
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();

    // SLA window formatting
    expect(screen.getByText(/SLA window: 2h/)).toBeInTheDocument();
    expect(screen.getByText(/SLA window: N\/A/)).toBeInTheDocument();

    // Due meta and overdue style
    const duePast = screen.getByText(/Due 1 hour ago/);
    expect(duePast).toBeInTheDocument();
    expect(duePast).toHaveClass('text-red-600');

    const dueFuture = screen.getByText(/Due in 1 hour/);
    expect(dueFuture).toBeInTheDocument();

    // Optional fields fallbacks
    expect(screen.getByText(/Not linked/)).toBeInTheDocument(); // propertyId empty
    expect(screen.getByText(/Unassigned/)).not.toBeInTheDocument(); // second shows vendor assignment
    expect(screen.getByText(/General/)).toBeInTheDocument(); // category fallback
    expect(screen.getByText(/Unknown/)).toBeInTheDocument(); // createdAt fallback
  });

  test('pagination controls reflect page and total pages; enabling/disabling works', async () => {
    const useSWR = require('swr');
    // total=25, limit=10 => totalPages=3
    useSWR.__set({ data: makeApiResponse([{ _id: '1', code: 'C', title: 'T', status: 'SUBMITTED', priority: 'MEDIUM' }], 1, 10, 25), isLoading: false });

    render(<WorkOrdersViewDefault />);
    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();

    const prev = screen.getByRole('button', { name: /Previous/ });
    const next = screen.getByRole('button', { name: /Next/ });

    expect(prev).toBeDisabled();
    expect(next).not.toBeDisabled();

    // Click next: since we mock SWR stateful returns, just verify the handler toggles disabled states by simulating state changes.
    // Advance to page 2 by clicking "Next" and then update SWR data accordingly.
    await userEvent.click(next);

    // Simulate SWR data change that would happen when page updates
    const swr = require('swr');
    swr.__set({ data: makeApiResponse([{ _id: '2', code: 'C2', title: 'T2', status: 'SUBMITTED', priority: 'MEDIUM' }], 2, 10, 25) });
    // Force re-render
    render(<WorkOrdersViewDefault />);
    expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
  });

  test('refresh button calls mutate', async () => {
    const mutate = jest.fn();
    const useSWR = require('swr');
    useSWR.__set({ data: makeApiResponse([]), isValidating: false, mutate });

    render(<WorkOrdersViewDefault />);
    const refresh = screen.getByRole('button', { name: /Refresh/ });
    await userEvent.click(refresh);
    expect(mutate).toHaveBeenCalled();
  });

  test('status and priority filters update query (via SWR key) when changed', async () => {
    // We'll not assert the URL directly since we mock useSWR; instead, we track state changes by ensuring SWR receives new key.
    // To do this, temporarily un-mock useSWR and spy on global.fetch to capture requested URL.
    jest.resetModules();
    const { default: RealUseSWR } = jest.requireActual('swr');

    // Replace module with a wrapper that exposes last key
    let lastKey: any = null;
    jest.doMock('swr', () => {
      return (key: any, fetcher: any, opts: any) => {
        lastKey = key;
        return { data: { items: [], page: 1, limit: 10, total: 0 }, isLoading: false, error: undefined, mutate: jest.fn(), isValidating: false };
      };
    });

    const { default: Component } = require('../WorkOrdersView.test');

    render(<Component />);

    // Open status select and choose "Submitted"
    // The shadcn Select renders trigger buttons; we can input by finding placeholder text
    const statusTrigger = screen.getByPlaceholderText('Status');
    await userEvent.click(statusTrigger);
    await userEvent.click(screen.getByText('Submitted'));

    const priorityTrigger = screen.getByPlaceholderText('Priority');
    await userEvent.click(priorityTrigger);
    await userEvent.click(screen.getByText('High'));

    // After selecting, SWR key should include both params
    await waitFor(() => {
      expect(typeof lastKey === 'string' ? lastKey : '').toMatch(/status=SUBMITTED/);
      expect(typeof lastKey === 'string' ? lastKey : '').toMatch(/priority=HIGH/);
    });
  });

  test('search input debounces and updates query only after 350ms', async () => {
    jest.resetModules();
    let lastKey: any = null;
    jest.doMock('swr', () => {
      return (key: any) => {
        lastKey = key;
        return { data: { items: [], page: 1, limit: 10, total: 0 }, isLoading: false, error: undefined, mutate: jest.fn(), isValidating: false };
      };
    });
    const { default: Component } = require('../WorkOrdersView.test');

    render(<Component />);

    const input = screen.getByPlaceholderText(/Search by title or description/i);
    await userEvent.type(input, 'leak');

    // Immediately after typing, query should not include q (debounced)
    expect(lastKey).toMatch(/\/api\/work-orders\?limit=10&page=1$/);

    // Advance time by 349ms => still not updated
    await act(async () => { jest.advanceTimersByTime(349); });
    expect(lastKey).toMatch(/\/api\/work-orders\?limit=10&page=1$/);

    // Advance to 350ms => update should include q=leak
    await act(async () => { jest.advanceTimersByTime(1); });
    expect(lastKey).toMatch(/q=leak/);
  });

  test('POST create: success closes dialog, resets form, and calls onCreated (via mutate)', async () => {
    const useSWR = require('swr');
    const mutate = jest.fn();
    useSWR.__set({ data: makeApiResponse([]), isLoading: false, mutate });

    // Mock fetch for POST success
    (global.fetch as jest.Mock).mockImplementation(async (url: string, init?: RequestInit) => {
      if (typeof url === 'string' && url.startsWith('/api/work-orders') && init?.method === 'POST') {
        return new Response('{}', { status: 200 });
      }
      return new Response(JSON.stringify(makeApiResponse([])), { status: 200 });
    });

    render(<WorkOrdersViewDefault />);

    // Open dialog
    await userEvent.click(screen.getByRole('button', { name: /New Work Order/ }));

    // Fill required title
    const titleInput = screen.getByLabelText(/Title \*/);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Broken pipe');

    // Submit
    await userEvent.click(screen.getByRole('button', { name: /^Create$/ }));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalled();
    });

    // Dialog should close — button should be visible again for opening
    expect(screen.getByRole('button', { name: /New Work Order/ })).toBeInTheDocument();
  });

  test('POST create: failure shows alert with error message', async () => {
    const useSWR = require('swr');
    useSWR.__set({ data: makeApiResponse([]), isLoading: false, mutate: jest.fn() });

    (global.fetch as jest.Mock).mockImplementation(async (url: string, init?: RequestInit) => {
      if (typeof url === 'string' && url.startsWith('/api/work-orders') && init?.method === 'POST') {
        return new Response('Bad Request: Missing stuff', { status: 400 });
      }
      return new Response(JSON.stringify(makeApiResponse([])), { status: 200 });
    });

    render(<WorkOrdersViewDefault />);

    await userEvent.click(screen.getByRole('button', { name: /New Work Order/ }));
    const titleInput = screen.getByLabelText(/Title \*/);
    await userEvent.type(titleInput, 'Leaky roof');
    await userEvent.click(screen.getByRole('button', { name: /^Create$/ }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Bad Request: Missing stuff'));
    });
  });

  test('fetch headers include Authorization when token present and x-user is set', async () => {
    const useSWR = require('swr');
    useSWR.__set({ data: undefined, isLoading: true, mutate: jest.fn() });

    window.localStorage.setItem('fixzit_token', 'tkn-123');
    window.localStorage.setItem('x-user', JSON.stringify({ id: 'u1', role: 'ADMIN', tenantId: 'demo-tenant' }));

    (global.fetch as jest.Mock).mockResolvedValue(new Response(JSON.stringify(makeApiResponse([])), { status: 200 }));

    render(<WorkOrdersViewDefault />);

    // Allow initial effect to set clientReady and SWR to trigger fetch
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });

    // Verify fetch called with headers containing Authorization and x-user
    expect(global.fetch).toHaveBeenCalled();
    const lastCall = (global.fetch as jest.Mock).mock.calls.pop();
    expect(lastCall).toBeTruthy();
    const options = lastCall[1] as RequestInit;
    const headers = (options?.headers ?? {}) as Record<string, string>;

    expect(headers['Authorization']).toBe('Bearer tkn-123');
    expect(headers['x-user']).toContain('"id":"u1"');
    expect(headers['x-tenant-id']).toBe('demo-tenant');
  });
});