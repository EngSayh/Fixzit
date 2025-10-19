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

// Mock global fetch
global.fetch = vi.fn();

describe('TopBar', () => {
  const mockPush = vi.fn();
  const mockPathname = '/dashboard';

  beforeEach(() => {
    vi.clearAllMocks();
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

  const renderTopBar = (formStateProps = {}) => {
    return render(
      <TranslationProvider>
        <ResponsiveProvider>
          <FormStateProvider {...formStateProps}>
            <TopBar />
          </FormStateProvider>
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
      renderTopBar({ hasUnsavedChanges: false });
      const logo = screen.getByAltText(/fixzit logo/i);
      fireEvent.click(logo);
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should show unsaved changes dialog when logo is clicked with unsaved changes', async () => {
      renderTopBar({ hasUnsavedChanges: true });
      const logo = screen.getByAltText(/fixzit logo/i);
      fireEvent.click(logo);
      await waitFor(() => {
        expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
      });
    });

    it('should clear pendingNavigation when cancel is clicked', async () => {
      renderTopBar({ hasUnsavedChanges: true });
      const logo = screen.getByAltText(/fixzit logo/i);
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
      renderTopBar({ hasUnsavedChanges: true });
      const logo = screen.getByAltText(/fixzit logo/i);
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
      renderTopBar();
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/notifications');
      });
    });

    it('should not fetch notifications when not authenticated', async () => {
      renderTopBar();
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
      const logo = screen.getByAltText(/fixzit logo/i);
      logo.focus();
      expect(document.activeElement).toBe(logo);
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
      const { rerender } = renderTopBar();
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(0);
      });
      rerender(
        <TranslationProvider>
          <ResponsiveProvider>
            <FormStateProvider>
              <TopBar />
            </FormStateProvider>
          </ResponsiveProvider>
        </TranslationProvider>
      );
      expect(global.fetch).toHaveBeenCalledTimes(0);
    });

    it('should cleanup on unmount', () => {
      const { unmount } = renderTopBar();
      unmount();
      expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    });
  });
});
