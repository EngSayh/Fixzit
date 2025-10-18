import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TopBar from '../TopBar';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => '/dashboard',
}));

// Mock i18n
vi.mock('@/utils/i18n', () => ({
  useLanguage: () => ({
    t: (key: string, fallback: string) => fallback,
    currentLang: 'en',
    isRTL: false,
  }),
}));

// Mock screen utils
vi.mock('@/utils/screenInfo', () => ({
  useScreenInfo: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenClass: 'xl',
  }),
}));

// Mock GlobalSearch component
vi.mock('../GlobalSearch', () => ({
  default: () => <div data-testid="global-search">Global Search</div>,
}));

// Mock AppSwitcher component
vi.mock('../AppSwitcher', () => ({
  default: () => <div data-testid="app-switcher">App Switcher</div>,
}));

describe('TopBar', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset fetch mock
    global.fetch = vi.fn();
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

    it('should render notification bell button', () => {
      render(<TopBar />);
      const notificationBtn = screen.getByLabelText(/notifications/i);
      expect(notificationBtn).toBeInTheDocument();
    });

    it('should render user menu button', () => {
      render(<TopBar />);
      const userMenuBtn = screen.getByLabelText(/user menu/i);
      expect(userMenuBtn).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on interactive elements', () => {
      render(<TopBar />);
      expect(screen.getByLabelText(/notifications/i)).toHaveAttribute('aria-label');
      expect(screen.getByLabelText(/user menu/i)).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation with Escape key', async () => {
      render(<TopBar />);
      const userMenuBtn = screen.getByLabelText(/user menu/i);
      
      // Open user menu
      fireEvent.click(userMenuBtn);
      await waitFor(() => {
        expect(screen.getByText(/sign out/i)).toBeVisible();
      });

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByText(/sign out/i)).not.toBeVisible();
      });
    });

    it('should close popups when clicking outside', async () => {
      render(<TopBar />);
      const userMenuBtn = screen.getByLabelText(/user menu/i);
      
      // Open user menu
      fireEvent.click(userMenuBtn);
      await waitFor(() => {
        expect(screen.getByText(/sign out/i)).toBeVisible();
      });

      // Click outside
      fireEvent.mouseDown(document.body);
      await waitFor(() => {
        expect(screen.queryByText(/sign out/i)).not.toBeVisible();
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
      const userMenuBtn = screen.getByLabelText(/user menu/i);
      
      // Initially closed
      expect(screen.queryByText(/sign out/i)).not.toBeVisible();

      // Click to open
      fireEvent.click(userMenuBtn);
      await waitFor(() => {
        expect(screen.getByText(/sign out/i)).toBeVisible();
      });

      // Click to close
      fireEvent.click(userMenuBtn);
      await waitFor(() => {
        expect(screen.queryByText(/sign out/i)).not.toBeVisible();
      });
    });

    it('should close notification popup when opening user menu', async () => {
      render(<TopBar />);
      const notificationBtn = screen.getByLabelText(/notifications/i);
      const userMenuBtn = screen.getByLabelText(/user menu/i);
      
      // Open notifications
      fireEvent.click(notificationBtn);
      await waitFor(() => {
        expect(screen.getByText(/no notifications/i)).toBeVisible();
      });

      // Open user menu - should close notifications
      fireEvent.click(userMenuBtn);
      await waitFor(() => {
        expect(screen.queryByText(/no notifications/i)).not.toBeVisible();
        expect(screen.getByText(/sign out/i)).toBeVisible();
      });
    });
  });

  describe('Logout Functionality', () => {
    it('should call logout API and redirect on logout', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
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

      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
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
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
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
      const notificationBtn = screen.getByLabelText(/notifications/i);
      
      // Initially closed
      expect(screen.queryByText(/no notifications/i)).not.toBeVisible();

      // Click to open
      fireEvent.click(notificationBtn);
      await waitFor(() => {
        expect(screen.getByText(/no notifications/i)).toBeVisible();
      });

      // Click to close
      fireEvent.click(notificationBtn);
      await waitFor(() => {
        expect(screen.queryByText(/no notifications/i)).not.toBeVisible();
      });
    });

    it('should display notification badge when notifications exist', () => {
      // This would require passing notifications as props or fetching them
      // Implementation depends on how notifications are managed
      render(<TopBar />);
      const badge = screen.queryByText('3');
      // Adjust based on actual implementation
      expect(badge).toBeInTheDocument();
    });
  });

  describe('formatTimeAgo Helper', () => {
    it('should format timestamps correctly', () => {
      // This tests the internal helper function behavior
      // You would need to expose it or test through rendered notifications
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      
      // Test would verify the displayed time in notification items
      // Example: expect(screen.getByText('2h ago')).toBeInTheDocument();
    });
  });

  describe('getPriorityColor Helper', () => {
    it('should return correct color classes for priority levels', () => {
      // Test through rendered notification items with different priorities
      // Example: expect(highPriorityNotification).toHaveClass('text-red-600');
    });
  });

  describe('RTL Support', () => {
    it('should apply RTL classes when isRTL is true', () => {
      // Mock RTL language
      vi.mock('@/utils/i18n', () => ({
        useLanguage: () => ({
          t: (key: string, fallback: string) => fallback,
          currentLang: 'ar',
          isRTL: true,
        }),
      }));

      render(<TopBar />);
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('flex-row-reverse');
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should hide GlobalSearch on mobile devices', () => {
      vi.mock('@/utils/screenInfo', () => ({
        useScreenInfo: () => ({
          isMobile: true,
          isTablet: false,
          isDesktop: false,
          screenClass: 'xs',
        }),
      }));

      render(<TopBar />);
      const globalSearch = screen.getByTestId('global-search');
      expect(globalSearch.parentElement).toHaveClass('hidden');
    });
  });
});
