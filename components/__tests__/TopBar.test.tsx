import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import TopBar from '../TopBar';
import { TranslationProvider } from '@/contexts/TranslationContext';
import { ResponsiveProvider } from '@/contexts/ResponsiveContext';
import { FormStateProvider } from '@/contexts/FormStateContext';
import { useRouter, usePathname } from 'next/navigation';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock Portal component
vi.mock('../Portal', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock child components
vi.mock('../i18n/LanguageSelector', () => ({
  default: () => <div data-testid="language-selector">Language Selector</div>,
}));

vi.mock('../i18n/CurrencySelector', () => ({
  default: () => <div data-testid="currency-selector">Currency Selector</div>,
}));

vi.mock('../topbar/AppSwitcher', () => ({
  default: () => <div data-testid="app-switcher">App Switcher</div>,
}));

vi.mock('../topbar/GlobalSearch', () => ({
  default: () => <div data-testid="global-search">Global Search</div>,
}));

vi.mock('../topbar/QuickActions', () => ({
  default: () => <div data-testid="quick-actions">Quick Actions</div>,
}));

// Mock session
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  },
  expires: '2025-12-31',
};

// Helper function to wrap component with providers
const renderWithProviders = (component: React.ReactElement, options = {}) => {
  return render(
    <SessionProvider session={mockSession}>
      <TranslationProvider>
        <ResponsiveProvider>
          <FormStateProvider>{component}</FormStateProvider>
        </ResponsiveProvider>
      </TranslationProvider>
    </SessionProvider>,
    options
  );
};

describe('TopBar Component', () => {
  let mockRouter: any;
  let mockPush: any;

  beforeEach(() => {
    mockPush = vi.fn();
    mockRouter = {
      push: mockPush,
      replace: vi.fn(),
      refresh: vi.fn(),
    };
    (useRouter as any).mockReturnValue(mockRouter);
    (usePathname as any).mockReturnValue('/dashboard');

    // Mock fetch API
    global.fetch = vi.fn();

    // Reset localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the TopBar component', () => {
      renderWithProviders(<TopBar />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should render the logo', () => {
      renderWithProviders(<TopBar />);
      const logo = screen.getByAlt('Fixzit Enterprise');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', '/img/logo.jpg');
    });

    it('should render the brand text', () => {
      renderWithProviders(<TopBar />);
      expect(screen.getByText('FIXZIT ENTERPRISE')).toBeInTheDocument();
    });

    it('should render all major sections', () => {
      renderWithProviders(<TopBar />);
      expect(screen.getByTestId('app-switcher')).toBeInTheDocument();
      expect(screen.getByTestId('global-search')).toBeInTheDocument();
      expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
    });
  });

  describe('Logo Navigation', () => {
    it('should navigate to home when logo is clicked without unsaved changes', async () => {
      renderWithProviders(<TopBar />);
      
      const logoButton = screen.getByLabelText('Go to home');
      fireEvent.click(logoButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    it('should show unsaved changes dialog when logo is clicked with unsaved changes', async () => {
      // Mock FormStateContext to have unsaved changes
      const TestWrapper = () => (
        <TranslationProvider>
          <ResponsiveProvider>
            <FormStateProvider>
              <TopBar />
              <form data-modified="true">
                <input name="test" />
              </form>
            </FormStateProvider>
          </ResponsiveProvider>
        </TranslationProvider>
      );

      render(<TestWrapper />);

      const logoButton = screen.getByLabelText('Go to home');
      fireEvent.click(logoButton);

      // Wait for the dialog to appear
      await waitFor(() => {
        expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
      });
    });
  });

  describe('Authentication', () => {
    it('should check authentication status on mount', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true }),
      });

      renderWithProviders(<TopBar />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/me');
      });
    });

    it('should handle authentication check failure', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<TopBar />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/me');
      });
    });
  });

  describe('Notifications', () => {
    it('should render notification bell button', () => {
      renderWithProviders(<TopBar />);
      const bellButton = screen.getByLabelText(/notifications/i);
      expect(bellButton).toBeInTheDocument();
    });

    it('should toggle notification dropdown when bell is clicked', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true }),
      });

      renderWithProviders(<TopBar />);

      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      // Notification panel should appear
      await waitFor(() => {
        expect(screen.getByText(/notifications/i)).toBeInTheDocument();
      });
    });

    it('should fetch notifications when dropdown opens for authenticated users', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ authenticated: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              {
                id: '1',
                title: 'Test Notification',
                message: 'Test message',
                timestamp: new Date().toISOString(),
                read: false,
                priority: 'high',
                category: 'system',
                type: 'alert',
              },
            ],
          }),
        });

      renderWithProviders(<TopBar />);

      // Wait for auth check
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/me');
      });

      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      // Wait for notifications fetch
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/notifications?limit=5&read=false',
          expect.objectContaining({
            credentials: 'include',
          })
        );
      });
    });

    it('should show loading state while fetching notifications', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ authenticated: true }),
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ ok: true, json: async () => ({ items: [] }) }), 100)
            )
        );

      renderWithProviders(<TopBar />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/me');
      });

      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });
    });

    it('should show empty state when no notifications', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ authenticated: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [] }),
        });

      renderWithProviders(<TopBar />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/me');
      });

      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
      });
    });

    it('should close notification dropdown when clicking outside', async () => {
      renderWithProviders(<TopBar />);

      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      // Click outside
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByRole('region', { name: /notifications/i })).not.toBeInTheDocument();
      });
    });

    it('should close notification dropdown on Escape key', async () => {
      renderWithProviders(<TopBar />);

      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('region', { name: /notifications/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('User Menu', () => {
    it('should render user menu button', () => {
      renderWithProviders(<TopBar />);
      const userButton = screen.getByLabelText(/profile/i);
      expect(userButton).toBeInTheDocument();
    });

    it('should toggle user menu dropdown when clicked', async () => {
      renderWithProviders(<TopBar />);

      const userButton = screen.getByLabelText(/profile/i);
      fireEvent.click(userButton);

      await waitFor(() => {
        expect(screen.getByText(/settings/i)).toBeInTheDocument();
      });
    });

    it('should show language and currency selectors in user menu', async () => {
      renderWithProviders(<TopBar />);

      const userButton = screen.getByLabelText(/profile/i);
      fireEvent.click(userButton);

      await waitFor(() => {
        expect(screen.getByTestId('language-selector')).toBeInTheDocument();
        expect(screen.getByTestId('currency-selector')).toBeInTheDocument();
      });
    });

    it('should handle sign out correctly', async () => {
      renderWithProviders(<TopBar />);

      const userButton = screen.getByLabelText(/profile/i);
      fireEvent.click(userButton);

      const signOutButton = screen.getByText(/sign out/i);
      fireEvent.click(signOutButton);

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBeNull();
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should close user menu when clicking outside', async () => {
      renderWithProviders(<TopBar />);

      const userButton = screen.getByLabelText(/profile/i);
      fireEvent.click(userButton);

      // Click outside
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByText(/settings/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Unsaved Changes Dialog', () => {
    it('should show dialog when navigating with unsaved changes', async () => {
      const TestWrapper = () => (
        <TranslationProvider>
          <ResponsiveProvider>
            <FormStateProvider>
              <TopBar />
              <form data-modified="true">
                <input name="test" defaultValue="changed" />
              </form>
            </FormStateProvider>
          </ResponsiveProvider>
        </TranslationProvider>
      );

      render(<TestWrapper />);

      const logoButton = screen.getByLabelText('Go to home');
      fireEvent.click(logoButton);

      await waitFor(() => {
        expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
      });
    });

    it('should allow user to save and navigate', async () => {
      const TestWrapper = () => (
        <TranslationProvider>
          <ResponsiveProvider>
            <FormStateProvider>
              <TopBar />
              <form data-modified="true" onSubmit={(e) => e.preventDefault()}>
                <input name="test" defaultValue="changed" />
              </form>
            </FormStateProvider>
          </ResponsiveProvider>
        </TranslationProvider>
      );

      render(<TestWrapper />);

      const logoButton = screen.getByLabelText('Go to home');
      fireEvent.click(logoButton);

      await waitFor(() => {
        expect(screen.getByText(/save/i)).toBeInTheDocument();
      });

      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    it('should allow user to discard and navigate', async () => {
      const TestWrapper = () => (
        <TranslationProvider>
          <ResponsiveProvider>
            <FormStateProvider>
              <TopBar />
              <form data-modified="true">
                <input name="test" defaultValue="changed" />
              </form>
            </FormStateProvider>
          </ResponsiveProvider>
        </TranslationProvider>
      );

      render(<TestWrapper />);

      const logoButton = screen.getByLabelText('Go to home');
      fireEvent.click(logoButton);

      await waitFor(() => {
        expect(screen.getByText(/discard/i)).toBeInTheDocument();
      });

      const discardButton = screen.getByText(/discard/i);
      fireEvent.click(discardButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    it('should allow user to cancel and stay on page', async () => {
      const TestWrapper = () => (
        <TranslationProvider>
          <ResponsiveProvider>
            <FormStateProvider>
              <TopBar />
              <form data-modified="true">
                <input name="test" defaultValue="changed" />
              </form>
            </FormStateProvider>
          </ResponsiveProvider>
        </TranslationProvider>
      );

      render(<TestWrapper />);

      const logoButton = screen.getByLabelText('Go to home');
      fireEvent.click(logoButton);

      await waitFor(() => {
        expect(screen.getByText(/cancel/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByText(/cancel/i);
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
        expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should hide brand text on mobile screens', () => {
      // Mock responsive context to simulate mobile
      const { container } = renderWithProviders(<TopBar />);
      
      // Brand text should have hidden class on mobile
      const brandText = screen.getByText('FIXZIT ENTERPRISE');
      expect(brandText).toHaveClass('hidden', 'md:block');
    });

    it('should adapt layout for RTL languages', () => {
      // RTL support is handled by ResponsiveContext
      renderWithProviders(<TopBar />);
      
      // TopBar should render without errors in RTL mode
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });

  describe('Route Change Handling', () => {
    it('should close all dropdowns when route changes', async () => {
      const { rerender } = renderWithProviders(<TopBar />);

      // Open notification dropdown
      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      // Simulate route change
      (usePathname as any).mockReturnValue('/settings');
      rerender(
        <TranslationProvider>
          <ResponsiveProvider>
            <FormStateProvider>
              <TopBar />
            </FormStateProvider>
          </ResponsiveProvider>
        </TranslationProvider>
      );

      await waitFor(() => {
        expect(screen.queryByRole('region', { name: /notifications/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(<TopBar />);

      expect(screen.getByLabelText('Go to home')).toBeInTheDocument();
      expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/profile/i)).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      renderWithProviders(<TopBar />);

      const logoButton = screen.getByLabelText('Go to home');
      expect(logoButton).toHaveAttribute('type', 'button');
    });

    it('should close dropdowns on Escape key', async () => {
      renderWithProviders(<TopBar />);

      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('region', { name: /notifications/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle notification fetch errors gracefully', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ authenticated: true }),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<TopBar />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/me');
      });

      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      // Should show empty state instead of error
      await waitFor(() => {
        expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
      });
    });

    it('should handle save errors in unsaved changes dialog', async () => {
      const mockRequestSave = vi.fn().mockRejectedValue(new Error('Save failed'));

      const TestWrapper = () => (
        <TranslationProvider>
          <ResponsiveProvider>
            <FormStateProvider requestSave={mockRequestSave}>
              <TopBar />
              <form data-modified="true">
                <input name="test" defaultValue="changed" />
              </form>
            </FormStateProvider>
          </ResponsiveProvider>
        </TranslationProvider>
      );

      render(<TestWrapper />);

      const logoButton = screen.getByLabelText('Go to home');
      fireEvent.click(logoButton);

      await waitFor(() => {
        expect(screen.getByText(/save/i)).toBeInTheDocument();
      });

      const saveButton = screen.getByText(/save/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
      });
    });
  });

  describe('Role Prop', () => {
    it('should accept and handle role prop', () => {
      renderWithProviders(<TopBar role="admin" />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should default to guest role if not provided', () => {
      renderWithProviders(<TopBar />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });
});
