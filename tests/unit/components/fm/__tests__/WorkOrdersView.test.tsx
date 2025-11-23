import { vi } from 'vitest';
import React, { type ComponentProps } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig, mutate as globalMutate } from 'swr';

// Import the component from its actual location
import WorkOrdersViewDefault, { WorkOrdersView } from '@/components/fm/WorkOrdersView';

vi.mock('date-fns', async () => {
  const actual = await vi.importActual<typeof import('date-fns')>('date-fns');
  return {
    ...actual,
    formatDistanceToNowStrict: vi.fn((date: Date) => {
      // Provide a deterministic label for tests based on timestamp relation to "now"
      const now = Date.now();
      const diffMs = date.getTime() - now;
      if (Number.isNaN(date.getTime())) return 'Invalid';
      if (diffMs < 0) return '1 hour ago';
      return 'in 1 hour';
    }),
  };
});

vi.mock('@/components/ClientDate', () => {
  const MockClientDate = ({ date }: { date: unknown }) => (
    <span data-testid="client-date">{String(date)}</span>
  );
  return { __esModule: true, default: MockClientDate };
});

// Helper to wrap components with SWR cache that doesn't dedupe/revalidate during tests
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

const renderWorkOrdersView = (
  props?: Partial<ComponentProps<typeof WorkOrdersView>>
) => {
  let rendered: ReturnType<typeof render> | undefined;
  act(() => {
    rendered = render(<WorkOrdersViewDefault orgId="org-test" {...props} />, { wrapper: TestWrapper });
  });
  return rendered!;
};

// JSDOM has localStorage; ensure clean state
beforeEach(() => {
  // FIX: Use real timers by default since SWR + debouncing + useEffect causes hangs with fake timers
  // Individual tests can opt into fake timers if needed for specific debounce testing
  vi.stubGlobal('fetch', vi.fn() as unknown as typeof fetch);
  window.localStorage.clear();
  vi.stubGlobal('alert', vi.fn());
  // Clear SWR cache before each test
  globalMutate(() => true, undefined, { revalidate: false });
});

afterEach(() => {
  vi.useRealTimers(); // Cleanup in case any test used fake timers
  vi.clearAllMocks();
});

const makeApiResponse = (items: any[], page = 1, limit = 10, total?: number) => ({
  items, page, limit, total: total ?? items.length,
});

describe('WorkOrdersView', () => {
  test('renders default heading and description', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => makeApiResponse([]),
    });

    renderWorkOrdersView();
    
    expect(screen.getByRole('heading', { name: /Work Orders/i })).toBeInTheDocument();
    expect(screen.getByText(/Manage and track work orders/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });
  });

  test('renders custom heading and description via props', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => makeApiResponse([]),
    });

    renderWorkOrdersView({ heading: 'My WOs', description: 'Desc here' });
    
    expect(screen.getByRole('heading', { name: /My WOs/ })).toBeInTheDocument();
    expect(screen.getByText(/Desc here/)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });
  });

  test('shows loading card when isLoading and no data', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    renderWorkOrdersView();
    expect(screen.getByText(/Loading work orders/i)).toBeInTheDocument();
  });

  test('shows error card when error is present', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network broken'));

    renderWorkOrdersView();
    
    await waitFor(() => {
      expect(screen.getByText(/Network broken/)).toBeInTheDocument();
    });
  });

  test('shows empty state when no work orders and no error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => makeApiResponse([]),
    });

    renderWorkOrdersView();
    
    await waitFor(() => {
      expect(screen.getByText(/No work orders match the current filters/i)).toBeInTheDocument();
    });
  });

  test('renders list items with badges and computed meta including overdue styling', async () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const past = new Date(now - 60 * 60 * 1000).toISOString(); // 1h ago
    const future = new Date(now + 60 * 60 * 1000).toISOString(); // in 1h

    const items = [
      { _id: '1', workOrderNumber: 'WO-1', title: 'Fix sink', status: 'SUBMITTED', priority: 'HIGH', sla: { resolutionDeadline: past, resolutionTimeMinutes: 120 }, description: 'desc', location: { propertyId: 'P1' }, assignment: { assignedTo: { userId: 'U1' } }, category: 'PLUMBING', createdAt: new Date(now - 5000).toISOString() },
      { _id: '2', workOrderNumber: 'WO-2', title: 'Check HVAC', status: 'COMPLETED', priority: 'LOW', sla: { resolutionDeadline: future }, assignment: { assignedTo: { vendorId: 'VND-9' } } },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => makeApiResponse(items),
    });

    renderWorkOrdersView();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Fix sink')).toBeInTheDocument();
    });

    // Titles
    expect(screen.getByText('Fix sink')).toBeInTheDocument();
    expect(screen.getByText('Check HVAC')).toBeInTheDocument();

    // Codes
    expect(screen.getByText(/Code: WO-1/)).toBeInTheDocument();
    expect(screen.getByText(/Code: WO-2/)).toBeInTheDocument();

    // Priority badges content
    expect(screen.getAllByText(/Priority: /)[0]).toHaveTextContent('Priority: High');
    expect(screen.getAllByText(/Priority: /)[1]).toHaveTextContent('Priority: Low');

    // Status labels (use getAllByText since status appears in dropdown and badge)
    const submittedElements = screen.getAllByText('Submitted');
    expect(submittedElements.length).toBeGreaterThan(0);
    expect(submittedElements[submittedElements.length - 1]).toBeInTheDocument();
    // FIX: Use getAllByText for 'Completed' since it appears in both dropdown and badge
    const completedElements = screen.getAllByText('Completed');
    expect(completedElements.length).toBeGreaterThan(0);

    // SLA window formatting
    expect(screen.getByText(/SLA window: 2h/)).toBeInTheDocument();
    expect(screen.getByText(/SLA window: N\/A/)).toBeInTheDocument();

    // Due meta and overdue style
    const duePast = screen.getByText(/Due 1 hour ago/);
    expect(duePast).toBeInTheDocument();
    expect(duePast).toHaveClass('text-destructive');

    const dueFuture = screen.getByText(/Due in 1 hour/);
    expect(dueFuture).toBeInTheDocument();

    // Optional fields fallbacks
    expect(screen.getByText(/Not linked/)).toBeInTheDocument(); // propertyId empty
    expect(screen.queryByText(/Unassigned/)).not.toBeInTheDocument(); // second shows vendor assignment
    expect(screen.getByText(/General/)).toBeInTheDocument(); // category fallback
    expect(screen.getByText(/Unknown/)).toBeInTheDocument(); // createdAt fallback
  });

  test('pagination controls reflect page and total pages; enabling/disabling works', async () => {
    // total=25, limit=10 => totalPages=3
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => makeApiResponse([{ _id: '1', code: 'C', title: 'T', status: 'SUBMITTED', priority: 'MEDIUM' }], 1, 10, 25),
    });

    renderWorkOrdersView();
    
    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    });

    const prev = screen.getByRole('button', { name: /Previous/ });
    const next = screen.getByRole('button', { name: /Next/ });

    expect(prev).toBeDisabled();
    expect(next).not.toBeDisabled();

    // Mock the fetch for page 2
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => makeApiResponse([{ _id: '2', code: 'C2', title: 'T2', status: 'SUBMITTED', priority: 'MEDIUM' }], 2, 10, 25),
    });

    await userEvent.click(next);

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
    });
  });

  test('refresh button calls mutate', async () => {
    let fetchCallCount = 0;
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      fetchCallCount++;
      return {
        ok: true,
        json: async () => makeApiResponse([]),
      };
    });

    renderWorkOrdersView();
    
    await waitFor(() => {
      expect(fetchCallCount).toBe(1); // Initial fetch
    });

    const refresh = screen.getByRole('button', { name: /Refresh/ });
    await userEvent.click(refresh);
    
    await waitFor(() => {
      expect(fetchCallCount).toBe(2); // Refetch after clicking refresh
    });
  });

  test('status and priority filters update query (via SWR key) when changed', async () => {
    // Track fetch URLs to verify query parameters
    const fetchedUrls: string[] = [];
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      fetchedUrls.push(url);
      return {
        ok: true,
        json: async () => makeApiResponse([]),
      };
    });

    renderWorkOrdersView();

    // Wait for initial fetch
    await waitFor(() => {
      expect(fetchedUrls.length).toBeGreaterThan(0);
    });

    // FIX: These are native HTML select elements, not combobox role. Query by name attribute or label.
    const statusSelect = screen.getAllByRole('combobox')[0]; // First select is status
    await userEvent.selectOptions(statusSelect, 'SUBMITTED');

    // Verify fetch was called with status parameter
    await waitFor(() => {
      const lastUrl = fetchedUrls[fetchedUrls.length - 1];
      expect(lastUrl).toMatch(/status=SUBMITTED/);
    });

    const prioritySelect = screen.getAllByRole('combobox')[1]; // Second select is priority
    await userEvent.selectOptions(prioritySelect, 'HIGH');

    // Verify fetch was called with both parameters
    await waitFor(() => {
      const lastUrl = fetchedUrls[fetchedUrls.length - 1];
      expect(lastUrl).toMatch(/status=SUBMITTED/);
      expect(lastUrl).toMatch(/priority=HIGH/);
    });
  });

});
