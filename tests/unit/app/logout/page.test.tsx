import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

// Mock dependencies before importing component
const mockPush = vi.fn();
const mockSignOut = vi.fn();
const mockLoggerWarn = vi.fn();
const mockLoggerError = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('next-auth/react', () => ({
  signOut: mockSignOut,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: mockLoggerWarn,
    error: mockLoggerError,
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/contexts/TranslationContext', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
    locale: 'en',
  }),
}));

vi.mock('@/components/brand', () => ({
  BrandLogo: ({ 'data-testid': testId }: { 'data-testid'?: string }) => (
    <img src="/logo.png" alt="Fixzit" data-testid={testId || 'brand-logo'} />
  ),
}));

// Import component after mocks
import LogoutPage from '@/app/logout/page';
import { STORAGE_KEYS, APP_STORAGE_KEYS, STORAGE_PREFIXES } from '@/config/constants';

describe('LogoutPage', () => {
  let originalLocalStorage: Storage;
  let originalSessionStorage: Storage;
  let localStorageStore: Record<string, string>;
  let sessionStorageStore: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Setup default signOut mock
    mockSignOut.mockResolvedValue({ url: '/login' });

    // Save original storage
    originalLocalStorage = window.localStorage;
    originalSessionStorage = window.sessionStorage;

    // Setup mock storage
    localStorageStore = {};
    sessionStorageStore = {};

    const createMockStorage = (store: Record<string, string>): Storage => ({
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
      key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
      get length() { return Object.keys(store).length; },
    });

    Object.defineProperty(window, 'localStorage', {
      value: createMockStorage(localStorageStore),
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'sessionStorage', {
      value: createMockStorage(sessionStorageStore),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    
    // Restore original storage
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true,
      configurable: true,
    });
  });

  describe('Basic Rendering', () => {
    test('renders logout page with processing state initially', async () => {
      render(<LogoutPage />);
      
      expect(screen.getByTestId('logout-page')).toBeInTheDocument();
      expect(screen.getByTestId('logout-spinner')).toBeInTheDocument();
      expect(screen.getByText('Signing you out...')).toBeInTheDocument();
    });

    test('shows success state after signOut completes', async () => {
      render(<LogoutPage />);
      
      // Let the logout process complete
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600); // Wait for 500ms delay + buffer
      });

      await waitFor(() => {
        expect(screen.getByTestId('logout-success')).toBeInTheDocument();
      });
      expect(screen.getByText('Logged out successfully')).toBeInTheDocument();
    });

    test('redirects to login after success', async () => {
      render(<LogoutPage />);
      
      // Complete logout and success display
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600); // 500ms delay + 1000ms success display
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('Storage Cleanup', () => {
    test('preserves language preference during logout', async () => {
      // Set up initial storage state
      localStorageStore[STORAGE_KEYS.language] = 'ar';
      localStorageStore[STORAGE_KEYS.locale] = 'ar-OM';
      localStorageStore['app.some-key'] = 'should-be-removed';

      render(<LogoutPage />);
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      // Language should be preserved
      expect(window.localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.language, 'ar');
      expect(window.localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.locale, 'ar-OM');
    });

    test('clears session storage during logout', async () => {
      render(<LogoutPage />);
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      expect(window.sessionStorage.clear).toHaveBeenCalled();
    });
  });

  describe('localStorage Guard (Regression: audit fix)', () => {
    /**
     * REGRESSION TEST: localStorage access must be guarded
     * 
     * This test ensures that logout works correctly even when localStorage
     * throws errors, which happens in:
     * - Safari Private Mode
     * - Strict CSP environments
     * - When storage quota is exceeded
     * - Embedded iframes with storage restrictions
     * 
     * Fix applied in: app/logout/page.tsx
     * Issue: Unguarded localStorage access could crash logout flow
     */
    test('handles localStorage.getItem throwing error gracefully', async () => {
      // Make localStorage.getItem throw (Safari private mode behavior)
      const mockGetItem = vi.fn().mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
      Object.defineProperty(window, 'localStorage', {
        value: {
          ...window.localStorage,
          getItem: mockGetItem,
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
          key: vi.fn(),
          length: 0,
        },
        writable: true,
        configurable: true,
      });

      render(<LogoutPage />);
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      // Logout should still succeed despite storage error
      await waitFor(() => {
        expect(screen.getByTestId('logout-success')).toBeInTheDocument();
      });

      // Should log warning about storage issue
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        'Storage unavailable during logout',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    test('handles Object.keys(localStorage) throwing error gracefully', async () => {
      // Create a proxy that throws on iteration (some CSP restrictions)
      const throwingStorage = new Proxy({} as Storage, {
        get(target, prop) {
          if (prop === 'getItem') return vi.fn().mockReturnValue(null);
          if (prop === 'setItem') return vi.fn();
          if (prop === 'removeItem') return vi.fn();
          if (prop === 'clear') return vi.fn();
          if (prop === 'length') return 0;
          if (prop === Symbol.iterator || prop === 'key') {
            return () => { throw new Error('Storage access denied'); };
          }
          return undefined;
        },
        ownKeys() {
          throw new Error('Storage enumeration denied');
        },
      });

      Object.defineProperty(window, 'localStorage', {
        value: throwingStorage,
        writable: true,
        configurable: true,
      });

      render(<LogoutPage />);
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      // Logout should still succeed
      await waitFor(() => {
        expect(screen.getByTestId('logout-success')).toBeInTheDocument();
      });
    });

    test('handles sessionStorage.clear throwing error gracefully', async () => {
      Object.defineProperty(window, 'sessionStorage', {
        value: {
          clear: vi.fn().mockImplementation(() => {
            throw new Error('SecurityError');
          }),
          getItem: vi.fn(),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          key: vi.fn(),
          length: 0,
        },
        writable: true,
        configurable: true,
      });

      render(<LogoutPage />);
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      // Logout should still succeed
      await waitFor(() => {
        expect(screen.getByTestId('logout-success')).toBeInTheDocument();
      });

      // Should log warning about session storage issue
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        'Failed to clear session storage',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    test('handles complete storage unavailability', async () => {
      // Simulate completely unavailable localStorage
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // This should not throw - component should handle undefined localStorage
      expect(() => {
        render(<LogoutPage />);
      }).not.toThrow();
    });
  });

  describe('Cookie Cleanup', () => {
    let originalCookie: string;

    beforeEach(() => {
      originalCookie = document.cookie;
      Object.defineProperty(document, 'cookie', {
        writable: true,
        configurable: true,
        value: '',
      });
    });

    afterEach(() => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        configurable: true,
        value: originalCookie,
      });
    });

    test('clears auth cookies during logout', async () => {
      const cookieWrites: string[] = [];
      Object.defineProperty(document, 'cookie', {
        set: (value: string) => cookieWrites.push(value),
        get: () => '',
        configurable: true,
      });

      render(<LogoutPage />);
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      // Should attempt to clear various auth cookies
      expect(cookieWrites.some(c => c.includes('next-auth.session-token'))).toBe(true);
      expect(cookieWrites.some(c => c.includes('authjs.session-token'))).toBe(true);
      expect(cookieWrites.some(c => c.includes('fxz.access'))).toBe(true);
    });

    test('handles cookie clearing errors gracefully', async () => {
      // Make cookie setter throw
      Object.defineProperty(document, 'cookie', {
        set: () => { throw new Error('Cookie access denied'); },
        get: () => '',
        configurable: true,
      });

      render(<LogoutPage />);
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      // Logout should still succeed
      await waitFor(() => {
        expect(screen.getByTestId('logout-success')).toBeInTheDocument();
      });

      // Should log warning
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        'Failed to clear auth cookies on logout',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    test('shows error state when signOut fails', async () => {
      mockSignOut.mockRejectedValueOnce(new Error('Network error'));

      render(<LogoutPage />);
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      await waitFor(() => {
        expect(screen.getByTestId('logout-error')).toBeInTheDocument();
      });
      expect(screen.getByText('Logout error')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    test('redirects to login even after error', async () => {
      mockSignOut.mockRejectedValueOnce(new Error('Network error'));

      render(<LogoutPage />);
      
      // Wait for error state and redirect
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2100); // 2000ms error redirect delay
      });

      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    test('logs error when signOut fails', async () => {
      const testError = new Error('Test logout error');
      mockSignOut.mockRejectedValueOnce(testError);

      render(<LogoutPage />);
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith('Logout error:', testError);
      });
    });
  });

  describe('NextAuth Integration', () => {
    test('calls signOut with correct options', async () => {
      render(<LogoutPage />);
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(mockSignOut).toHaveBeenCalledWith({
        redirect: false,
        redirectTo: '/login',
      });
    });

    test('uses signOut response URL for redirect', async () => {
      mockSignOut.mockResolvedValueOnce({ url: '/custom-redirect' });

      render(<LogoutPage />);
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      expect(mockPush).toHaveBeenCalledWith('/custom-redirect');
    });

    test('falls back to /login if signOut returns no URL', async () => {
      mockSignOut.mockResolvedValueOnce({ url: null });

      render(<LogoutPage />);
      
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });
});
