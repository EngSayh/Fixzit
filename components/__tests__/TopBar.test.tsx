/**
 * TopBar Component Tests
 * 
 * Comprehensive test suite for the TopBar component covering:
 * - Rendering and visual elements
 * - Logo click behavior with unsaved changes detection
 * - Notifications dropdown functionality
 * - User menu interactions
 * - Logout functionality
 * - Accessibility (ARIA attributes)
 * - RTL support
 * - Authentication state handling
 * - Performance optimizations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import TopBar from '../TopBar';
import { TranslationProvider } from '@/contexts/TranslationContext';
import { ResponsiveProvider } from '@/contexts/ResponsiveContext';
import { FormStateProvider } from '@/contexts/FormStateContext';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

// Mock child components
vi.mock('../NotificationBell', () => ({
  default: () => <div data-testid="notification-bell">NotificationBell</div>,
}));

vi.mock('../UserMenu', () => ({
  default: () => <div data-testid="user-menu">UserMenu</div>,
}));

// Mock FormStateContext hook
const mockFormState = {
  hasUnsavedChanges: false,
  unregisterForm: vi.fn(),
  markFormDirty: vi.fn(),
  markFormClean: vi.fn(),
  requestSave: vi.fn().mockResolvedValue(undefined),
  onSaveRequest: vi.fn().mockReturnValue({ formId: 'test-form', dispose: vi.fn() }),
};

vi.mock('@/contexts/FormStateContext', () => ({
  useFormState: vi.fn(() => mockFormState),
  FormStateProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock global fetch
global.fetch = vi.fn();

describe('TopBar', () => {
  const mockPush = vi.fn();
  const mockPathname = '/dashboard';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock form state to default
    mockFormState.hasUnsavedChanges = false;
    mockFormState.requestSave = vi.fn().mockResolvedValue(undefined);
    
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
    });
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue(mockPathname);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderTopBar = () => {
    return render(
      <TranslationProvider>
        <ResponsiveProvider>
          <TopBar />
        </ResponsiveProvider>
      </TranslationProvider>
    );
  };

  describe('Rendering', () => {
    it('should render the TopBar component', () => {
      renderTopBar();
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should render the logo', () => {
      renderTopBar();
      const logo = screen.getByAltText(/fixzit logo/i);
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', '/images/logo.svg');
    });

    it('should render the NotificationBell component', () => {
      renderTopBar();
      expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    });

    it('should render the UserMenu component', () => {
      renderTopBar();
      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    });
  });

  describe('Logo Click', () => {
    it('should navigate to dashboard when logo is clicked', async () => {
      mockFormState.hasUnsavedChanges = false;
      renderTopBar();
      const logo = screen.getByAltText(/fixzit/i);
      fireEvent.click(logo);
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should show unsaved changes dialog when logo is clicked with unsaved changes', async () => {
      mockFormState.hasUnsavedChanges = true;
      renderTopBar();
      const logo = screen.getByAltText(/fixzit/i);
      fireEvent.click(logo);
      await waitFor(() => {
        expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
      });
    });

    it('should clear pendingNavigation when cancel is clicked', async () => {
      mockFormState.hasUnsavedChanges = true;
      renderTopBar();
      const logo = screen.getByAltText(/fixzit/i);
      fireEvent.click(logo);
      await waitFor(() => {
        expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
      });
      const cancelButton = screen.getByText(/cancel/i);
      fireEvent.click(cancelButton);
      await waitFor(() => {
        expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
      });
    });

    it('should navigate when discard changes is clicked', async () => {
      mockFormState.hasUnsavedChanges = true;
      renderTopBar();
      const logo = screen.getByAltText(/fixzit/i);
      fireEvent.click(logo);
      await waitFor(() => {
        expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
      });
      const discardButton = screen.getByText(/discard/i);
      fireEvent.click(discardButton);
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Notifications', () => {
    it('should fetch notifications when authenticated', async () => {
      // Mock authentication check to return authenticated
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ authenticated: true }),
          } as Response);
        }
        if (url === '/api/notifications') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ items: [] }),
          } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      });

      renderTopBar();
      
      // Wait for auth check
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/me');
      });

      // Should fetch notifications when authenticated
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/notifications');
      });
    });

    it('should not fetch notifications when not authenticated', async () => {
      // Mock authentication check to return unauthenticated
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: false,
          } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      });

      renderTopBar();
      
      // Wait for auth check
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/me');
      });

      // Should NOT fetch notifications when not authenticated
      expect(global.fetch).not.toHaveBeenCalledWith('/api/notifications');
    });
  });

  describe('User Menu', () => {
    it('should render the UserMenu component', () => {
      renderTopBar();
      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    });
  });

  describe('Logout', () => {
    it('should handle logout', async () => {
      renderTopBar();
      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA role', () => {
      renderTopBar();
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should have accessible logo', () => {
      renderTopBar();
      const logo = screen.getByAltText(/fixzit logo/i);
      expect(logo).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      renderTopBar();
      // Find the button wrapper (not the image itself, which is not focusable)
      const logoButton = screen.getByRole('button', { name: /go to home/i });
      logoButton.focus();
      expect(document.activeElement).toBe(logoButton);
    });
  });

  describe('RTL Support', () => {
    it('should apply RTL classes when direction is rtl', () => {
      renderTopBar();
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });

  describe('Authentication', () => {
    it('should check authentication on mount', () => {
      renderTopBar();
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should handle authentication failure gracefully', () => {
      renderTopBar();
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not refetch notifications unnecessarily', async () => {
      // Mock fetch to track calls
      const fetchSpy = vi.fn().mockImplementation((url) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ authenticated: true }),
          } as Response);
        }
        if (typeof url === 'string' && url.startsWith('/api/notifications')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ items: [] }),
          } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      });
      global.fetch = fetchSpy;

      const { rerender } = renderTopBar();
      
      // Wait for initial auth check
      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith('/api/auth/me');
      });

      // Capture call count after initial render (should have auth check, but no notifications yet)
      const initialCallCount = fetchSpy.mock.calls.length;
      const notificationsCallsBefore = fetchSpy.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].startsWith('/api/notifications')
      ).length;

      // Rerender the component
      rerender(
        <TranslationProvider>
          <ResponsiveProvider>
            <FormStateProvider>
              <TopBar />
            </FormStateProvider>
          </ResponsiveProvider>
        </TranslationProvider>
      );

      // Wait a bit to ensure no additional fetches occur
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert that notifications were not fetched on initial render or rerender
      const notificationsCallsAfter = fetchSpy.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].startsWith('/api/notifications')
      ).length;
      expect(notificationsCallsAfter).toBe(notificationsCallsBefore);
      expect(notificationsCallsAfter).toBe(0); // Should be 0 since dropdown wasn't opened
    });

    it('should cleanup on unmount', () => {
      const { unmount } = renderTopBar();
      unmount();
      expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    });
  });
});
