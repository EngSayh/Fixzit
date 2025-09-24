/**
 * Tests for ClientLayout
 * Testing framework: Jest with React Testing Library (@testing-library/react)
 * Notes:
 *  - Mocks next/navigation, contexts, and child components.
 *  - Uses JSDOM for document lang/dir assertions.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock next/navigation usePathname
const mockUsePathname = jest.fn<string, []>(() => '/dashboard');
jest.mock('next/navigation', () => ({
  // Keep any other exports minimal
  usePathname: () => mockUsePathname(),
}));

// Mock contexts: Responsive and Translation
const mockUseResponsive = jest.fn(() => ({ screenInfo: { width: 1024, height: 768, isMobile: false } }));
jest.mock('@/src/contexts/ResponsiveContext', () => ({
  useResponsive: () => mockUseResponsive(),
}));

// We'll swap behavior of useTranslation in individual tests via mock implementations
const mockUseTranslation = jest.fn();
jest.mock('@/src/contexts/TranslationContext', () => ({
  useTranslation: () => mockUseTranslation(),
}));

// Mock child components to simplify tree and capture props
jest.mock('./TopBar', () => ({
  __esModule: true,
  default: (props: { role: string }) => <div data-testid="TopBar" data-role={props.role}>TopBar</div>,
}));
jest.mock('./Sidebar', () => ({
  __esModule: true,
  default: (props: { role: string, subscription: string, tenantId: string }) => (
    <aside data-testid="Sidebar" data-role={props.role} data-sub={props.subscription} data-tenant={props.tenantId}>Sidebar</aside>
  ),
}));
jest.mock('./Footer', () => ({
  __esModule: true,
  default: () => <footer data-testid="Footer">Footer</footer>,
}));
jest.mock('./HelpWidget', () => ({
  __esModule: true,
  default: () => <div data-testid="HelpWidget">HelpWidget</div>,
}));
jest.mock('./AutoFixInitializer', () => ({
  __esModule: true,
  default: () => <div data-testid="AutoFixInitializer">AutoFixInitializer</div>,
}));
jest.mock('./ErrorTest', () => ({
  __esModule: true,
  default: () => <div data-testid="ErrorTest">ErrorTest</div>,
}));
jest.mock('./ResponsiveLayout', () => ({
  __esModule: true,
  default: (props: { header: React.ReactNode, sidebar?: React.ReactNode, showSidebarToggle?: boolean, children?: React.ReactNode }) => (
    <div data-testid="ResponsiveLayout" data-show-toggle={props.showSidebarToggle ? 'true' : 'false'}>
      <div data-testid="ResponsiveHeader">{props.header}</div>
      {props.sidebar ? <div data-testid="ResponsiveSidebar">{props.sidebar}</div> : null}
      <div data-testid="ResponsiveMain">{props.children}</div>
    </div>
  ),
}));

// Import the component under test after mocks
import ClientLayout from './ClientLayout';

// Helpers to control fetch/localStorage
declare global {
  // eslint-disable-next-line no-var
  var fetch: jest.Mock;
}
const originalLang = document.documentElement.lang;
const originalDir = document.documentElement.dir;

beforeEach(() => {
  // Reset DOM attributes
  document.documentElement.lang = originalLang || '';
  document.documentElement.dir = originalDir || '';

  // Clear storage and mocks
  localStorage.clear();
  jest.clearAllMocks();

  // Default translation: English LTR
  mockUseTranslation.mockImplementation(() => ({ language: 'en', isRTL: false }));

  // Default pathname: non-landing
  mockUsePathname.mockImplementation(() => '/dashboard');

  // Default fetch mock
  global.fetch = jest.fn();
});

afterAll(() => {
  (console.warn as jest.Mock).mockRestore();
  (console.error as jest.Mock).mockRestore();
});

function renderWithChildren(children: React.ReactNode = <div data-testid="Child">Child</div>) {
  return render(<ClientLayout>{children}</ClientLayout>);
}

test('shows loading UI initially, with TopBar and Footer present', async () => {
  // Hold fetch promise to keep loading momentarily
  let resolveFetch: (v: any) => void;
  (global.fetch as jest.Mock).mockReturnValue(new Promise(res => { resolveFetch = res as any; }));

  renderWithChildren();

  expect(screen.getByText('Loading...')).toBeInTheDocument();
  expect(screen.getByTestId('TopBar')).toBeInTheDocument();
  expect(screen.getByTestId('Footer')).toBeInTheDocument();

  // Resolve fetch to allow completion
  resolveFetch?.({ ok: false });
  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
});

test('uses cached non-guest role from localStorage and skips fetch', async () => {
  localStorage.setItem('fixzit-role', 'admin');
  renderWithChildren();

  // Should bypass fetch and finish loading quickly
  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  expect(global.fetch).not.toHaveBeenCalled();

  // Role propagated to TopBar and Sidebar (non-landing path)
  expect(screen.getByTestId('TopBar')).toHaveAttribute('data-role', 'admin');

  expect(screen.getByTestId('Sidebar')).toHaveAttribute('data-role', 'admin');
});

test('when cached role is "guest", still fetches and updates to API role', async () => {
  localStorage.setItem('fixzit-role', 'guest');
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ user: { role: 'USER' } }),
  });

  renderWithChildren();

  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  expect(global.fetch).toHaveBeenCalledWith('/api/auth/me', { credentials: 'include' });
  expect(localStorage.getItem('fixzit-role')).toBe('USER');
  expect(screen.getByTestId('TopBar')).toHaveAttribute('data-role', 'USER');
  expect(screen.getByTestId('Sidebar')).toHaveAttribute('data-role', 'USER');
});

test('fetch success sets role from API and caches it', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ user: { role: 'MANAGER' } }),
  });

  renderWithChildren();

  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  expect(localStorage.getItem('fixzit-role')).toBe('MANAGER');
  expect(screen.getByTestId('TopBar')).toHaveAttribute('data-role', 'MANAGER');
  expect(screen.getByTestId('Sidebar')).toBeInTheDocument();
});

test('fetch non-ok sets role to guest and caches guest', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

  renderWithChildren();

  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  expect(localStorage.getItem('fixzit-role')).toBe('guest');
  expect(screen.getByTestId('TopBar')).toHaveAttribute('data-role', 'guest');
  expect(screen.getByTestId('Sidebar')).toBeInTheDocument();
});

test('fetch error sets role to guest and logs error', async () => {
  (global.fetch as jest.Mock).mockRejectedValue(new Error('network unreachable'));

  renderWithChildren();

  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  expect(localStorage.getItem('fixzit-role')).toBe('guest');
  expect(console.error).toHaveBeenCalledWith('Failed to fetch user role:', expect.any(Error));
  expect(screen.getByTestId('TopBar')).toHaveAttribute('data-role', 'guest');
});

test('translation context present sets document lang/dir accordingly (LTR)', async () => {
  mockUseTranslation.mockImplementation(() => ({ language: 'en', isRTL: false }));
  (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

  renderWithChildren();

  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  expect(document.documentElement.lang).toBe('en');
  expect(document.documentElement.dir).toBe('ltr');
});

test('translation context present sets document lang/dir accordingly (RTL)', async () => {
  mockUseTranslation.mockImplementation(() => ({ language: 'ar', isRTL: true }));
  (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

  renderWithChildren();

  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  expect(document.documentElement.lang).toBe('ar');
  expect(document.documentElement.dir).toBe('rtl');
});

test('when translation context throws, falls back to defaults and warns', async () => {
  mockUseTranslation.mockImplementation(() => { throw new Error('no provider'); });
  (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

  renderWithChildren();

  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  // Fallback language is 'ar' and isRTL false -> ltr
  expect(document.documentElement.lang).toBe('ar');
  expect(document.documentElement.dir).toBe('ltr');
  expect(console.warn).toHaveBeenCalledWith(
    'Translation context not available in ClientLayout:',
    expect.any(Error)
  );
});

test('on landing page ("/"), sidebar is not rendered and toggle is false', async () => {
  mockUsePathname.mockImplementation(() => '/'); // landing
  (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

  renderWithChildren();

  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  expect(screen.queryByTestId('Sidebar')).not.toBeInTheDocument();
  // ResponsiveLayout mock exposes toggle flag
  expect(screen.getByTestId('ResponsiveLayout')).toHaveAttribute('data-show-toggle', 'false');
});

test('on non-landing page, sidebar is rendered and toggle is true', async () => {
  mockUsePathname.mockImplementation(() => '/dashboard'); // non-landing
  (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

  renderWithChildren();

  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  expect(screen.getByTestId('Sidebar')).toBeInTheDocument();
  expect(screen.getByTestId('ResponsiveLayout')).toHaveAttribute('data-show-toggle', 'true');
});

test('renders AutoFixInitializer, HelpWidget, and ErrorTest after loading', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

  renderWithChildren();

  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  expect(screen.getByTestId('AutoFixInitializer')).toBeInTheDocument();
  expect(screen.getByTestId('HelpWidget')).toBeInTheDocument();
  expect(screen.getByTestId('ErrorTest')).toBeInTheDocument();
});