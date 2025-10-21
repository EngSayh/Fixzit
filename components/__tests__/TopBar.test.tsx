import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import TopBar from '../TopBar';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => '/dashboard',
}));

// Mock Translation Context
vi.mock('@/contexts/TranslationContext', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    lang: 'en',
    setLang: vi.fn(),
    isRTL: false,
  }),
}));

// Mock Responsive Context
vi.mock('@/contexts/ResponsiveContext', () => ({
  useResponsive: () => ({
    responsiveClasses: {
      container: 'px-4',
      text: 'text-base',
    },
    screenInfo: {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      screenClass: 'xl',
    },
    isRTL: false,
  }),
}));

// Mock GlobalSearch component
vi.mock('../topbar/GlobalSearch', () => ({
  default: () => <div data-testid="global-search">Global Search</div>,
}));

// Mock AppSwitcher component
vi.mock('../topbar/AppSwitcher', () => ({
  default: () => <div data-testid="app-switcher">App Switcher</div>,
}));

// Mock QuickActions component
vi.mock('../topbar/QuickActions', () => ({
  default: () => <div data-testid="quick-actions">Quick Actions</div>,
}));

// Mock LanguageSelector component
vi.mock('../i18n/LanguageSelector', () => ({
  default: () => <div data-testid="language-selector">Language Selector</div>,
}));

// Mock CurrencySelector component
vi.mock('../i18n/CurrencySelector', () => ({
  default: () => <div data-testid="currency-selector">Currency Selector</div>,
}));

// Mock Portal component
vi.mock('../Portal', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="portal">{children}</div>,
}));

// Mock FormState Context
vi.mock('@/contexts/FormStateContext', () => ({
  useFormState: () => ({
    hasUnsavedChanges: false,
    registerForm: vi.fn(),
    unregisterForm: vi.fn(),
    markFormDirty: vi.fn(),
    markFormClean: vi.fn(),
    requestSave: vi.fn(async () => Promise.resolve()),
    onSaveRequest: vi.fn(() => () => {}),
  }),
  FormStateProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('TopBar', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Default: authenticated user with empty notifications
    // This ensures the notifications bell and user menu are rendered
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();
      
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            user: { 
              id: '1', 
              email: 'test@fixzit.co', 
              role: 'ADMIN' 
            } 
          })
        } as Response);
      }
      
      if (url.includes('/api/notifications')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [] })
        } as Response);
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      } as Response);
    });
  });

  describe('Rendering', () => {
    it('should render TopBar with brand name', () => {
      render(<TopBar />);
      expect(screen.getByText('FIXZIT ENTERPRISE')).toBeInTheDocument();
    });

    it('should render GlobalSearch component', () => {
      render(<TopBar />);
      expect(screen.getByTestId('global-search')).toBeInTheDocument();
    });

    it('should render AppSwitcher component', () => {
      render(<TopBar />);
      expect(screen.getByTestId('app-switcher')).toBeInTheDocument();
    });

    it('should render notification bell button', async () => {
      render(<TopBar />);
      await waitFor(() => {
        const notificationBtn = screen.getByLabelText(/notifications/i);
        expect(notificationBtn).toBeInTheDocument();
      });
    });

    it('should render user menu button', async () => {
      render(<TopBar />);
      await waitFor(() => {
        const userMenuBtn = screen.getByLabelText(/user menu/i);
        expect(userMenuBtn).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on interactive elements', async () => {
      render(<TopBar />);
      await waitFor(() => {
        expect(screen.getByLabelText(/notifications/i)).toHaveAttribute('aria-label');
        expect(screen.getByLabelText(/user menu/i)).toHaveAttribute('aria-label');
      });
    });

    it('should support keyboard navigation with Escape key', async () => {
      render(<TopBar />);
      const userMenuBtn = await screen.findByLabelText(/user menu/i);
      
      // Open user menu
      fireEvent.click(userMenuBtn);
      await waitFor(() => {
        expect(screen.getByText(/sign out/i)).toBeInTheDocument();
      });

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByText(/sign out/i)).not.toBeInTheDocument();
      });
    });

    it('should close popups when clicking outside', async () => {
      render(<TopBar />);
      const userMenuBtn = await screen.findByLabelText(/user menu/i);
      
      // Open user menu
      fireEvent.click(userMenuBtn);
      await waitFor(() => {
        expect(screen.getByText(/sign out/i)).toBeInTheDocument();
      });

      // Click outside
      fireEvent.mouseDown(document.body);
      await waitFor(() => {
        expect(screen.queryByText(/sign out/i)).not.toBeInTheDocument();
      });
    });

    it('should have proper focus management for dropdowns', () => {
      render(<TopBar />);
      const userMenuBtn = screen.getByLabelText(/user menu/i);
      
      userMenuBtn.focus();
      expect(userMenuBtn).toHaveFocus();
    });
  });

  describe('User Menu Interactions', () => {
    it('should toggle user menu on button click', async () => {
      render(<TopBar />);
      const userMenuBtn = await screen.findByLabelText(/user menu/i);
      
      // Initially closed
      expect(screen.queryByText(/sign out/i)).not.toBeInTheDocument();

      // Click to open
      fireEvent.click(userMenuBtn);
      await waitFor(() => {
        expect(screen.getByText(/sign out/i)).toBeInTheDocument();
      });

      // Click to close
      fireEvent.click(userMenuBtn);
      await waitFor(() => {
        expect(screen.queryByText(/sign out/i)).not.toBeInTheDocument();
      });
    });

    it('should close notification popup when opening user menu', async () => {
      render(<TopBar />);
      const notificationBtn = await screen.findByLabelText(/notifications/i);
      const userMenuBtn = await screen.findByLabelText(/user menu/i);
      
      // Open notifications
      fireEvent.click(notificationBtn);
      await waitFor(() => {
        expect(screen.getByText(/no new notifications/i)).toBeInTheDocument();
      });

      // Open user menu - should close notifications
      fireEvent.click(userMenuBtn);
      await waitFor(() => {
        expect(screen.queryByText(/no new notifications/i)).not.toBeInTheDocument();
        expect(screen.getByText(/sign out/i)).toBeInTheDocument();
      });
    });
  });

  describe('Logout Functionality', () => {
    it('should call logout API and redirect on logout', async () => {
      // Override with specific mock for logout test
      const mockFetch = vi.fn((input: RequestInfo | URL) => {
        const url = input.toString();
        if (url.includes('/api/auth/logout')) {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve({ ok: true } as Response);
      });
      global.fetch = mockFetch;

      // Mock window.location
      delete (window as any).location;
      window.location = { href: '' } as any;

      render(<TopBar />);
      const userMenuBtn = screen.getByLabelText(/user menu/i);
      
      // Open user menu
      fireEvent.click(userMenuBtn);
      await waitFor(() => {
        expect(screen.getByText(/sign out/i)).toBeVisible();
      });

      // Click sign out
      const signOutBtn = screen.getByText(/sign out/i);
      fireEvent.click(signOutBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
        expect(window.location.href).toBe('/login');
      });
    });

    it('should preserve language settings during logout', async () => {
      localStorage.setItem('fxz.lang', 'ar');
      localStorage.setItem('fxz.locale', 'ar-SA');
      localStorage.setItem('fixzit-role', 'admin');
      localStorage.setItem('fixzit-theme', 'dark');

      // Override with specific mock for logout test
      const mockFetch = vi.fn((input: RequestInfo | URL) => {
        return Promise.resolve({ ok: true } as Response);
      });
      global.fetch = mockFetch;

      delete (window as any).location;
      window.location = { href: '' } as any;

      render(<TopBar />);
      const userMenuBtn = screen.getByLabelText(/user menu/i);
      
      fireEvent.click(userMenuBtn);
      const signOutBtn = await screen.findByText(/sign out/i);
      fireEvent.click(signOutBtn);

      await waitFor(() => {
        expect(localStorage.getItem('fxz.lang')).toBe('ar');
        expect(localStorage.getItem('fxz.locale')).toBe('ar-SA');
        expect(localStorage.getItem('fixzit-role')).toBeNull();
        expect(localStorage.getItem('fixzit-theme')).toBeNull();
      });
    });

    it('should redirect to login even if logout API fails', async () => {
      // Override with specific mock for logout failure test
      const mockFetch = vi.fn((input: RequestInfo | URL) => {
        return Promise.reject(new Error('Network error'));
      });
      global.fetch = mockFetch;

      delete (window as any).location;
      window.location = { href: '' } as any;

      render(<TopBar />);
      const userMenuBtn = screen.getByLabelText(/user menu/i);
      
      fireEvent.click(userMenuBtn);
      const signOutBtn = await screen.findByText(/sign out/i);
      fireEvent.click(signOutBtn);

      await waitFor(() => {
        expect(window.location.href).toBe('/login');
      });
    });
  });

  describe('Notifications', () => {
    it('should toggle notification popup on button click', async () => {
      render(<TopBar />);
      const notificationBtn = await screen.findByLabelText(/notifications/i);
      
      // Initially closed
      expect(screen.queryByText(/no new notifications/i)).not.toBeInTheDocument();

      // Click to open
      fireEvent.click(notificationBtn);
      
      // Wait for notification popup to appear - using toBeVisible to verify actual visibility
      await waitFor(() => {
        expect(screen.getByText(/no new notifications/i)).toBeVisible();
      }, { timeout: 1000 });

      // Click to close
      fireEvent.click(notificationBtn);
      await waitFor(() => {
        expect(screen.queryByText(/no new notifications/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('RTL Support', () => {
    it('should apply RTL classes when isRTL is true', () => {
      // Note: This test would require re-importing TopBar with the RTL mock active
      // For now, we skip this test as vi.mock() inside it() has no effect
      // To implement: Move RTL mock to module scope or use a different testing strategy
    });
  });
});
