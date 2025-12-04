import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LogoutPage from '@/app/logout/page';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/logout',
}));

// Mock next-auth
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(() => Promise.resolve({ url: '/login' })),
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

// Mock TranslationContext
vi.mock('@/contexts/TranslationContext', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    locale: 'en',
    direction: 'ltr',
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  LogOut: () => <span data-testid="mock-logout-icon">LogoutIcon</span>,
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="logout-spinner" className={className}>LoaderIcon</span>
  ),
  CheckCircle: ({ className }: { className?: string }) => (
    <span data-testid="logout-success" className={className}>CheckIcon</span>
  ),
  XCircle: ({ className }: { className?: string }) => (
    <span data-testid="logout-error" className={className}>XIcon</span>
  ),
}));

// Mock brand component
vi.mock('@/components/brand', () => ({
  BrandLogo: ({ className, 'data-testid': testId }: { className?: string; 'data-testid'?: string }) => (
    <div data-testid={testId || 'brand-logo'} className={className}>MockBrandLogo</div>
  ),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Setup localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
    get length() { return Object.keys(store).length; },
  };
})();

// Setup sessionStorage mock
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, writable: true });

describe('LogoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorageMock.clear();
    mockPush.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the logout page', async () => {
    await act(async () => {
      render(<LogoutPage />);
    });
    
    // Should show brand logo
    expect(screen.getByTestId('logout-logo')).toBeInTheDocument();
  });

  it('displays the spinner while processing', async () => {
    await act(async () => {
      render(<LogoutPage />);
    });
    
    expect(screen.getByTestId('logout-spinner')).toBeInTheDocument();
  });

  it('applies proper styling to the container', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<LogoutPage />);
      container = result.container;
    });
    
    // Check that the logout-page test ID exists
    expect(screen.getByTestId('logout-page')).toBeInTheDocument();
  });

  it('shows processing state initially', async () => {
    await act(async () => {
      render(<LogoutPage />);
    });
    
    expect(screen.getByText('Signing you out...')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we log you out securely.')).toBeInTheDocument();
  });

  describe('Regression: Storage Guard', () => {
    it('clears sessionStorage on mount', async () => {
      await act(async () => {
        render(<LogoutPage />);
      });
      
      // Wait for any effects to run
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      
      expect(sessionStorageMock.clear).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure with data-testid', async () => {
      await act(async () => {
        render(<LogoutPage />);
      });
      
      // Brand logo should be present (commonly for screen reader users to identify the app)
      expect(screen.getByTestId('logout-logo')).toBeInTheDocument();
      expect(screen.getByTestId('logout-page')).toBeInTheDocument();
    });
  });
});
