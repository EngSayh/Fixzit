import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';

jest.mock('next/link', () => {
  const React = require('react');
  return ({ href, children, ...rest }: any) => React.createElement('a', { href, ...rest }, children);
});

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

// Mock child components to reduce surface area
jest.mock('../../src/components/AppSwitcher', () => () => <div data-testid="app-switcher" />);
jest.mock('../../src/components/GlobalSearch', () => () => <div data-testid="global-search" />);
jest.mock('../../src/components/QuickActions', () => () => <div data-testid="quick-actions" />);
jest.mock('../../src/components/i18n/LanguageSelector', () => () => <div data-testid="language-selector" />);

// Responsive context
jest.mock('../../src/contexts/ResponsiveContext', () => ({
  useResponsive: () => ({
    responsiveClasses: { container: 'container' },
    screenInfo: { isMobile: false },
    isRTL: false,
  }),
}));

// Translation context default: provide a working t
jest.mock('../../src/contexts/TranslationContext', () => ({
  useTranslation: () => ({ t: (k: string, fallback?: string) => fallback ?? k }),
}));

// Import after mocks
import TopBar from '../../src/components/TopBar';

describe('TopBar component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T12:00:00.000Z'));
    pushMock.mockReset();
    // @ts-ignore
    global.fetch = jest.fn();
    // Reset localStorage
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    // @ts-ignore
    global.fetch.mockReset && global.fetch.mockReset();
  });

  const openNotifications = () => {
    const notifToggle = screen.getByRole('button', { name: /toggle notifications/i });
    fireEvent.click(notifToggle);
  };

  test('renders brand and key child components', () => {
    render(<TopBar role="guest" />);
    expect(screen.getByText(/FIXZIT ENTERPRISE/i)).toBeInTheDocument();
    expect(screen.getByTestId('app-switcher')).toBeInTheDocument();
    expect(screen.getByTestId('global-search')).toBeInTheDocument();
    expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
    expect(screen.getByTestId('language-selector')).toBeInTheDocument();
  });

  test('opens notifications popover and shows loading then renders items', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: '1',
            title: 'High Priority',
            message: 'Action required',
            timestamp: '2025-01-01T11:59:00.000Z',
            read: false,
            priority: 'high',
            category: 'alerts',
            type: 'system',
          },
          {
            id: '2',
            title: 'Low Priority',
            message: 'FYI only',
            timestamp: '2024-12-31T12:00:00.000Z',
            read: true,
            priority: 'low',
            category: 'info',
            type: 'system',
          },
        ],
      }),
    });

    render(<TopBar />);
    openNotifications();

    // Loading state
    expect(await screen.findByText(/loading/i)).toBeInTheDocument();

    // Items render
    const first = await screen.findByText('High Priority');
    expect(first).toBeInTheDocument();
    expect(screen.getByText('Action required')).toBeInTheDocument();

    // Unread count
    expect(screen.getByText(/1 unread/i)).toBeInTheDocument();

    // Priority chips and class mapping
    const chipHigh = screen.getByText('HIGH').closest('span');
    expect(chipHigh).toHaveClass('text-red-600');

    const chipLow = screen.getByText('LOW').closest('span');
    expect(chipLow).toHaveClass('text-green-600');

    // Time formatting
    expect(screen.getByText(/Just now|1m ago/i)).toBeInTheDocument(); // depending on clock tick
    expect(screen.getByText(/1d ago/i)).toBeInTheDocument();

    // "View all notifications" footer visible when items exist
    expect(screen.getByText(/View all notifications/i)).toBeInTheDocument();
  });

  test('closes notifications on outside click and Escape key', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });

    render(<TopBar />);
    openNotifications();
    expect(await screen.findByText(/Loading/i)).toBeInTheDocument();

    // After fetch resolves, empty state
    await screen.findByText(/No new notifications/i);

    // Click outside
    fireEvent.mouseDown(document.body);
    // Popover should close (button still exists)
    expect(screen.queryByText(/No new notifications/i)).not.toBeInTheDocument();

    // Re-open and close with Escape
    openNotifications();
    await screen.findByText(/No new notifications/i);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText(/No new notifications/i)).not.toBeInTheDocument();
  });

  test('handles fetch failure gracefully and shows empty state', async () => {
    // @ts-ignore
    global.fetch.mockRejectedValueOnce(new Error('network down'));

    render(<TopBar />);
    openNotifications();

    await screen.findByText(/Loading/i);
    const empty = await screen.findByText(/No new notifications/i);
    expect(empty).toBeInTheDocument();
    expect(screen.getByText(/You're all caught up!/i)).toBeInTheDocument();
  });

  test('non-ok response results in empty notification list', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ ok: false });

    render(<TopBar />);
    openNotifications();

    await screen.findByText(/Loading/i);
    const empty = await screen.findByText(/No new notifications/i);
    expect(empty).toBeInTheDocument();
  });

  test('clicking a notification navigates to /notifications and closes popover', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: '1',
            title: 'Go to details',
            message: 'Click to navigate',
            timestamp: '2025-01-01T11:59:00.000Z',
            read: false,
            priority: 'medium',
            category: 'alerts',
            type: 'system',
          },
        ],
      }),
    });

    render(<TopBar />);
    openNotifications();

    const item = await screen.findByText('Go to details');
    fireEvent.click(item);

    expect(pushMock).toHaveBeenCalledWith('/notifications');
    // popover closes
    expect(screen.queryByText('Go to details')).not.toBeInTheDocument();
  });

  test('logout clears storage and redirects to /login even if API fails', async () => {
    // Successful logout path
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ ok: true });

    render(<TopBar />);

    // Open user menu
    const userToggleButtons = screen.getAllByRole('button');
    const userToggle = userToggleButtons.find(b => within(b).queryByTestId('non-existent') === null && b !== document.body);
    // Find the user menu toggle by icon pattern (fallback if aria-label absent)
    // If ambiguous, click the last toggle (user dropdown typically last)
    fireEvent.click(userToggleButtons[userToggleButtons.length - 1]);

    const signOut = await screen.findByRole('button', { name: /sign out/i });
    localStorage.setItem('fixzit-role', 'x');
    localStorage.setItem('fxz.lang', 'en');
    localStorage.setItem('fixzit-currency', 'USD');
    localStorage.setItem('fixzit-theme', 'dark');
    localStorage.setItem('fixzit-other', 'foo');
    localStorage.setItem('fxz-other', 'bar');

    await act(async () => {
      fireEvent.click(signOut);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST', credentials: 'include' }));
    // Filtered removals
    expect(localStorage.getItem('fixzit-role')).toBeNull();
    expect(localStorage.getItem('fxz.lang')).toBeNull();
    expect(localStorage.getItem('fixzit-currency')).toBeNull();
    expect(localStorage.getItem('fixzit-theme')).toBeNull();
    // Generic cleanup loop
    expect(localStorage.getItem('fixzit-other')).toBeNull();
    expect(localStorage.getItem('fxz-other')).toBeNull();
    expect(pushMock).toHaveBeenCalledWith('/login');

    // Failure path: still redirects
    pushMock.mockClear();
    // @ts-ignore
    global.fetch.mockRejectedValueOnce(new Error('logout fail'));

    // Re-open user menu
    fireEvent.click(userToggleButtons[userToggleButtons.length - 1]);
    const signOut2 = await screen.findByRole('button', { name: /sign out/i });

    await act(async () => {
      fireEvent.click(signOut2);
    });
    expect(pushMock).toHaveBeenCalledWith('/login');
  });

  test('falls back to default translations if TranslationContext is unavailable', async () => {
    jest.resetModules();
    // Remock TranslationContext to throw when used (simulate missing provider)
    jest.doMock('../../src/contexts/TranslationContext', () => ({
      useTranslation: () => { throw new Error('no provider'); },
    }));
    // Keep other mocks consistent
    jest.doMock('../../src/contexts/ResponsiveContext', () => ({
      useResponsive: () => ({
        responsiveClasses: { container: 'container' },
        screenInfo: { isMobile: false },
        isRTL: false,
      }),
    }));
    const TopBarWithFallback = (await import('../../src/components/TopBar')).default;

    render(<TopBarWithFallback />);
    expect(screen.getByText(/FIXZIT ENTERPRISE/i)).toBeInTheDocument(); // fallbackTranslations['common.brand']
  });

  test('does not refetch notifications when reopening if list already loaded', async () => {
    // First fetch returns one item
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: '1',
            title: 'Initial',
            message: 'Loaded once',
            timestamp: '2025-01-01T11:59:00.000Z',
            read: false,
            priority: 'low',
            category: 'info',
            type: 'system',
          },
        ],
      }),
    });

    render(<TopBar />);
    openNotifications();
    await screen.findByText('Initial');

    // Close popover
    fireEvent.mouseDown(document.body);
    // Re-open: should not call fetch again because notifications length > 0
    await act(async () => {
      openNotifications();
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Initial')).toBeInTheDocument();
  });
});