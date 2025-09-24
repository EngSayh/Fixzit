/**
 * Tests for Notifications component
 * Testing framework: Jest
 * Libraries: @testing-library/react, @testing-library/jest-dom, and jest mocks
 *
 * Covers:
 * - Toggle open/close behavior
 * - Unread count badge rendering
 * - Loading state on first open
 * - Successful fetch path (items from response)
 * - Non-OK fetch path (fallback mock items)
 * - Error fetch path (console.error, loading cleared)
 * - Filtering by categories (all, work_orders, finance, support)
 * - Time-ago formatting edge cases
 * - RTL alignment class (left-0 vs right-0)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

// Attempt both possible import shapes in case the component is default/named export in repo.
// Adjust if your component export differs.

import { Notifications } from './Notifications';
// TopBar context needs to be mocked to control isRTL
jest.mock('@/src/contexts/TopBarContext', () => {
  return {
    useTopBar: jest.fn(() => ({ isRTL: false })),
  };
});

// The lucide-react Bell icon can be left as-is; it renders an SVG. No special mocking required.

// Global fetch mock
const originalFetch = global.fetch;
beforeEach(() => {
  jest.useFakeTimers(); // for time-related stabilization if needed
  jest.spyOn(global, 'fetch' as any).mockResolvedValue({
    ok: true,
    json: async () => ({ items: [] }),
  } as any);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  (global.fetch as jest.Mock | undefined)?.mockRestore?.();
  (console.error as jest.Mock).mockReset();
});

afterAll(() => {
  if (originalFetch) {
    // restore only if it existed
    // @ts-ignore
    global.fetch = originalFetch;
  }
});

function openNotifications() {
  const button = screen.getByRole('button', { name: /notifications/i });
  fireEvent.click(button);
}

function mockUseTopBar(isRTL: boolean) {
  const mod = require('@/src/contexts/TopBarContext');
  mod.useTopBar.mockReturnValue({ isRTL });
}

function buildItem(overrides: Partial<{
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low'|'medium'|'high';
  category: string;
}> = {}) {
  return {
    id: 'id-1',
    title: 'Title 1',
    message: 'Message 1',
    timestamp: new Date().toISOString(),
    read: false,
    priority: 'medium' as const,
    category: 'finance',
    ...overrides,
  };
}

describe('Notifications', () => {
  test('renders bell button and toggles open/close', () => {
    render(<Notifications />);
    const btn = screen.getByRole('button', { name: /notifications/i });
    expect(btn).toBeInTheDocument();

    // Initially closed: dropdown content not in document
    expect(screen.queryByText(/Notifications/i)).not.toBeInTheDocument();

    // Open
    fireEvent.click(btn);
    expect(screen.getByText('Notifications')).toBeInTheDocument();

    // Close via close button ×
    const closeBtn = screen.getByRole('button', { name: '×' });
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  test('shows loading state upon first open and then empty state when no items', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    } as any);

    render(<Notifications />);
    openNotifications();

    // Loading UI
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // After fetch resolves: empty state
    await waitFor(() => {
      expect(screen.getByText(/No notifications/i)).toBeInTheDocument();
      expect(screen.getByText(/You're all caught up\!/i)).toBeInTheDocument();
    });
  });

  test('renders items from successful fetch and displays unread count badge', async () => {
    const items = [
      buildItem({ id: '1', title: 'Invoice Payment Received', read: false, priority: 'medium', category: 'finance' }),
      buildItem({ id: '2', title: 'Property Inspection Due', read: false, priority: 'high', category: 'work_orders' }),
      buildItem({ id: '3', title: 'Support Ticket Resolved', read: true, priority: 'low', category: 'support' }),
    ];
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items }),
    } as any);

    render(<Notifications />);

    // Unread badge should not render until component is opened,
    // because notifications are not fetched until open.
    expect(screen.queryByText('2')).not.toBeInTheDocument();

    openNotifications();

    await waitFor(() => {
      // All 3 items render
      for (const item of items) {
        expect(screen.getByText(item.title)).toBeInTheDocument();
      }
    });

    // Unread count badge should now show 2 (two items unread)
    expect(screen.getByText('2')).toBeInTheDocument();

    // Priority chips present
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('LOW')).toBeInTheDocument();
  });

  test('falls back to mock notifications when response.ok is false', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ items: [] }),
    } as any);

    render(<Notifications />);
    openNotifications();

    await waitFor(() => {
      // Expect mock fallback titles defined in component
      expect(screen.getByText(/Invoice Payment Received/i)).toBeInTheDocument();
      expect(screen.getByText(/Property Inspection Due/i)).toBeInTheDocument();
    });

    // Unread count should be 2 since both mock items are unread
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('handles fetch error gracefully and clears loading', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network failure'));

    render(<Notifications />);
    openNotifications();

    // Loading initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      // Loading cleared and empty state is shown (no items loaded)
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      expect(screen.getByText(/No notifications/i)).toBeInTheDocument();
    });

    expect(console.error).toHaveBeenCalled();
  });

  test('filters by category correctly', async () => {
    const items = [
      buildItem({ id: '1', title: 'Finance A', category: 'finance' }),
      buildItem({ id: '2', title: 'WO A', category: 'work_orders' }),
      buildItem({ id: '3', title: 'Support A', category: 'support' }),
    ];
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items }),
    } as any);

    render(<Notifications />);
    openNotifications();

    // Wait for items to show up
    await screen.findByText('Finance A');
    await screen.findByText('WO A');
    await screen.findByText('Support A');

    const dropdown = screen.getByText('Notifications').closest('div') as Element;
    const filterRow = within(dropdown).getByText('All').closest('div') as Element;

    // Filter finance
    fireEvent.click(within(filterRow).getByRole('button', { name: 'finance' }));
    expect(screen.getByText('Finance A')).toBeInTheDocument();
    expect(screen.queryByText('WO A')).not.toBeInTheDocument();
    expect(screen.queryByText('Support A')).not.toBeInTheDocument();

    // Filter work orders
    fireEvent.click(within(filterRow).getByRole('button', { name: 'Work Orders' }));
    expect(screen.getByText('WO A')).toBeInTheDocument();
    expect(screen.queryByText('Finance A')).not.toBeInTheDocument();
    expect(screen.queryByText('Support A')).not.toBeInTheDocument();

    // Filter support
    fireEvent.click(within(filterRow).getByRole('button', { name: 'support' }));
    expect(screen.getByText('Support A')).toBeInTheDocument();
    expect(screen.queryByText('Finance A')).not.toBeInTheDocument();
    expect(screen.queryByText('WO A')).not.toBeInTheDocument();

    // Back to all
    fireEvent.click(within(filterRow).getByRole('button', { name: 'All' }));
    expect(screen.getByText('Finance A')).toBeInTheDocument();
    expect(screen.getByText('WO A')).toBeInTheDocument();
    expect(screen.getByText('Support A')).toBeInTheDocument();
  });

  test('time-ago formatting edge cases', async () => {
    const now = new Date();
    const items = [
      buildItem({ id: 't0', title: 'Now', timestamp: new Date(now.getTime() - 10 * 1000).toISOString() }), // <1m
      buildItem({ id: 't1', title: '59m', timestamp: new Date(now.getTime() - 59 * 60 * 1000).toISOString() }), // 59m
      buildItem({ id: 't2', title: '2h', timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() }), // 2h
      buildItem({ id: 't3', title: '3d', timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() }), // 3d
    ];
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items }),
    } as any);

    render(<Notifications />);
    openNotifications();

    await screen.findByText('Now');

    // Location of time text: next to priority chip in each card
    // We verify that the format is one of: Just now, Xm ago, Xh ago, Xd ago
    // The exact minute/hour/day may vary slightly depending on execution time differences,
    // so we check for substrings.
    const nowRow = screen.getByText('Now').closest('[class*="p-3"]') as Element;
    expect(within(nowRow).getByText(/Just now|0m ago/)).toBeInTheDocument();

    const row59 = screen.getByText('59m').closest('[class*="p-3"]') as Element;
    expect(within(row59).getByText(/m ago/)).toBeInTheDocument();

    const row2h = screen.getByText('2h').closest('[class*="p-3"]') as Element;
    expect(within(row2h).getByText(/h ago/)).toBeInTheDocument();

    const row3d = screen.getByText('3d').closest('[class*="p-3"]') as Element;
    expect(within(row3d).getByText(/d ago/)).toBeInTheDocument();
  });

  test('positions dropdown to the left when RTL and to the right when not RTL', async () => {
    // LTR
    mockUseTopBar(false);
    render(<Notifications />);
    openNotifications();
    await screen.findByText('Notifications');
    let panel = screen.getByText('Notifications').closest('div[class*="absolute"]') as Element;
    expect(panel).toHaveClass('right-0');
    expect(panel).not.toHaveClass('left-0');

    // Rerender with RTL
    // unmount then render again with RTL setting
    const { unmount } = { unmount: () => {} };
    // Force a fresh render with RTL mocked
    (require('@/src/contexts/TopBarContext').useTopBar as jest.Mock).mockReturnValue({ isRTL: true });
    render(<Notifications />);
    openNotifications();
    await screen.findByText('Notifications');
    panel = screen.getByText('Notifications').closest('div[class*="absolute"]') as Element;
    expect(panel).toHaveClass('left-0');
    expect(panel).not.toHaveClass('right-0');
  });
});