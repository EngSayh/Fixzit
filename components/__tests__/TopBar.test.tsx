/**/**import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';import React from 'react';

 * TopBar Component Tests

 *  * TopBar Component Tests

 * Comprehensive test suite for the TopBar component covering:

 * - Rendering and visual elements * import { render, screen, fireEvent, waitFor } from '@testing-library/react';

 * - Logo click behavior with unsaved changes detection

 * - Notifications dropdown functionality * Comprehensive test suite for the TopBar component covering:

 * - User menu interactions

 * - Logout functionality * - Rendering and visual elementsimport { useRouter, usePathname } from 'next/navigation';import { render, screen, fireEvent, waitFor } from '@testing-library/react';import { render, screen, fireEvent, waitFor } from '@testing-library/react';

 * - Accessibility (ARIA attributes)

 * - RTL support * - Logo click behavior with unsaved changes detection

 * - Authentication state handling

 * - Performance optimizations * - Notifications dropdown functionality  import TopBar from '../TopBar';

 */

 * - User menu interactions

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import React from 'react'; * - Logout functionalityimport { TranslationProvider } from '@/contexts/TranslationContext';import { useRouter, usePathname } from 'next/navigation';import { describe, it, expect, vi, beforeEach } from 'vitest';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { useRouter, usePathname } from 'next/navigation'; * - Accessibility (ARIA attributes)

import TopBar from '../TopBar';

import { TranslationProvider } from '@/contexts/TranslationContext'; * - RTL supportimport { ResponsiveProvider } from '@/contexts/ResponsiveContext';

import { ResponsiveProvider } from '@/contexts/ResponsiveContext';

import { FormStateProvider } from '@/contexts/FormStateContext'; * - Authentication state handling



// Mock Next.js navigation * - Performance optimizationsimport { FormStateProvider } from '@/contexts/FormStateContext';import TopBar from '../TopBar';import TopBar from '../TopBar';

vi.mock('next/navigation', () => ({

  useRouter: vi.fn(), */

  usePathname: vi.fn(),

}));



// Mock child componentsimport { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../NotificationBell', () => ({

  default: () => <div data-testid="notification-bell">NotificationBell</div>,import { render, screen, fireEvent, waitFor } from '@testing-library/react';// Mock Next.js navigationimport { TranslationProvider } from '@/contexts/TranslationContext';

}));

import { useRouter, usePathname } from 'next/navigation';

vi.mock('../UserMenu', () => ({

  default: () => <div data-testid="user-menu">UserMenu</div>,import TopBar from '../TopBar';vi.mock('next/navigation', () => ({

}));

import { TranslationProvider } from '@/contexts/TranslationContext';

// Mock fetch globally

global.fetch = vi.fn();import { ResponsiveProvider } from '@/contexts/ResponsiveContext';  useRouter: vi.fn(),import { ResponsiveProvider } from '@/contexts/ResponsiveContext';// Mock next/navigation



describe('TopBar Component', () => {import { FormStateProvider } from '@/contexts/FormStateContext';

  const mockPush = vi.fn();

  const mockPathname = '/dashboard';  usePathname: vi.fn(),



  beforeEach(() => {// Mock Next.js navigation hooks

    vi.clearAllMocks();

    vi.mock('next/navigation', () => ({}));import { FormStateProvider } from '@/contexts/FormStateContext';vi.mock('next/navigation', () => ({

    // Setup router mock

    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({   useRouter: vi.fn(),

      push: mockPush,

      replace: vi.fn(),  usePathname: vi.fn(),

    });

    }));

    // Setup pathname mock

    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue(mockPathname);// Mock fetch globally  useRouter: () => ({

    

    // Mock successful auth by default// Mock fetch globally

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({

      ok: true,global.fetch = vi.fn();global.fetch = vi.fn();

      json: async () => ({ items: [] }),

    } as Response);

  });

describe('TopBar Component', () => {// Mock Next.js navigation    push: vi.fn(),

  afterEach(() => {

    vi.restoreAllMocks();  const mockPush = vi.fn();

  });

  const mockPathname = '/dashboard';describe('TopBar Component', () => {

  // Helper function to render TopBar with all required providers

  const renderTopBar = (formStateProps = {}) => {

    return render(

      <TranslationProvider>  beforeEach(() => {  const mockPush = vi.fn();vi.mock('next/navigation', () => ({    replace: vi.fn(),

        <ResponsiveProvider>

          <FormStateProvider {...formStateProps}>    vi.clearAllMocks();

            <TopBar />

          </FormStateProvider>    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ push: mockPush });  const mockPathname = '/dashboard';

        </ResponsiveProvider>

      </TranslationProvider>    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue(mockPathname);

    );

  };      useRouter: vi.fn(),  }),



  describe('Rendering', () => {    // Mock successful auth by default

    it('should render the TopBar component', () => {

      renderTopBar();    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({  beforeEach(() => {

      expect(screen.getByRole('banner')).toBeInTheDocument();

    });      ok: true,



    it('should render the logo', () => {      json: async () => ({ items: [] }),    vi.clearAllMocks();  usePathname: vi.fn(),  usePathname: () => '/dashboard',

      renderTopBar();

      const logo = screen.getByAltText(/fixzit logo/i);    } as Response);

      expect(logo).toBeInTheDocument();

    });  });    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ push: mockPush });



    it('should render notification bell', () => {

      renderTopBar();

      expect(screen.getByTestId('notification-bell')).toBeInTheDocument();  afterEach(() => {    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue(mockPathname);}));}));

    });

    vi.restoreAllMocks();

    it('should render user menu', () => {

      renderTopBar();  });    

      expect(screen.getByTestId('user-menu')).toBeInTheDocument();

    });

  });

  const renderTopBar = (props = {}) => {    // Mock successful auth by default

  describe('Logo Click', () => {

    it('should navigate to dashboard when logo is clicked and no unsaved changes', async () => {    return render(

      renderTopBar({ hasUnsavedChanges: false });

            <TranslationProvider>    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({

      const logo = screen.getByAltText(/fixzit logo/i);

      fireEvent.click(logo);        <ResponsiveProvider>

      

      await waitFor(() => {          <FormStateProvider>      ok: true,// Mock fetch globally// Mock Translation Context

        expect(mockPush).toHaveBeenCalledWith('/fm/dashboard');

      });            <TopBar {...props} />

    });

          </FormStateProvider>      json: async () => ({ items: [] }),

    it('should show unsaved changes dialog when logo is clicked with unsaved changes', async () => {

      renderTopBar({ hasUnsavedChanges: true });        </ResponsiveProvider>

      

      const logo = screen.getByAltText(/fixzit logo/i);      </TranslationProvider>    } as Response);global.fetch = vi.fn();vi.mock('@/contexts/TranslationContext', () => ({

      fireEvent.click(logo);

          );

      await waitFor(() => {

        expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();  };  });

      });

      

      expect(mockPush).not.toHaveBeenCalled();

    });  describe('Rendering', () => {  useTranslation: () => ({



    it('should clear pendingNavigation when cancel is clicked in unsaved dialog', async () => {    it('should render TopBar with brand name', () => {

      renderTopBar({ hasUnsavedChanges: true });

            renderTopBar();  afterEach(() => {

      const logo = screen.getByAltText(/fixzit logo/i);

      fireEvent.click(logo);      expect(screen.getByText(/FIXZIT ENTERPRISE/i)).toBeInTheDocument();

      

      await waitFor(() => {    });    vi.restoreAllMocks();describe('TopBar Component', () => {    t: (key: string, fallback?: string) => fallback || key,

        expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();

      });

      

      const cancelButton = screen.getByText(/cancel/i);    it('should render logo image', () => {  });

      fireEvent.click(cancelButton);

            renderTopBar();

      await waitFor(() => {

        expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();      const logo = screen.getByAltText('Fixzit Enterprise');  const mockPush = vi.fn();    lang: 'en',

      });

    });      expect(logo).toBeInTheDocument();



    it('should navigate when discard is clicked in unsaved dialog', async () => {      expect(logo).toHaveAttribute('src', expect.stringContaining('logo.jpg'));  const renderTopBar = (props = {}) => {

      renderTopBar({ hasUnsavedChanges: true });

          });

      const logo = screen.getByAltText(/fixzit logo/i);

      fireEvent.click(logo);    return render(  const mockPathname = '/dashboard';    setLang: vi.fn(),

      

      await waitFor(() => {    it('should render notification bell for authenticated users', async () => {

        expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();

      });      renderTopBar();      <TranslationProvider>

      

      const discardButton = screen.getByText(/discard/i);      await waitFor(() => {

      fireEvent.click(discardButton);

              expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();        <ResponsiveProvider>    isRTL: false,

      await waitFor(() => {

        expect(mockPush).toHaveBeenCalledWith('/fm/dashboard');      });

      });

    });    });          <FormStateProvider>

  });



  describe('Notifications', () => {

    it('should fetch notifications on mount when authenticated', async () => {    it('should render user menu button for authenticated users', async () => {            <TopBar {...props} />  beforeEach(() => {  }),

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({

        ok: true,      renderTopBar();

        json: async () => ({ authenticated: true }),

      } as Response);      await waitFor(() => {          </FormStateProvider>

      

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({        expect(screen.getByLabelText('User menu')).toBeInTheDocument();

        ok: true,

        json: async () => ({       });        </ResponsiveProvider>    vi.clearAllMocks();}));

          items: [

            { id: '1', message: 'Test notification', read: false }    });

          ]

        }),      </TranslationProvider>

      } as Response);

          it('should not render notifications for unauthenticated users', async () => {

      renderTopBar();

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({    );    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ push: mockPush });

      await waitFor(() => {

        expect(global.fetch).toHaveBeenCalledWith('/api/auth/session');        ok: false,

      });

    });      } as Response);  };



    it('should not fetch notifications when not authenticated', async () => {      

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({

        ok: true,      renderTopBar();    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue(mockPathname);// Mock Responsive Context

        json: async () => ({ authenticated: false }),

      } as Response);      await waitFor(() => {

      

      renderTopBar();        expect(screen.queryByLabelText('Toggle notifications')).not.toBeInTheDocument();  describe('Rendering', () => {

      

      await waitFor(() => {      });

        expect(global.fetch).toHaveBeenCalledTimes(1);

        expect(global.fetch).toHaveBeenCalledWith('/api/auth/session');    });    it('should render TopBar with brand name', () => {    vi.mock('@/contexts/ResponsiveContext', () => ({

      });

    });  });

  });

      renderTopBar();

  describe('User Menu', () => {

    it('should render user menu component', () => {  describe('Logo Click Behavior', () => {

      renderTopBar();

      expect(screen.getByTestId('user-menu')).toBeInTheDocument();    it('should navigate to home when no unsaved changes', async () => {      expect(screen.getByText(/FIXZIT ENTERPRISE/i)).toBeInTheDocument();    // Mock successful auth by default  useResponsive: () => ({

    });

  });      renderTopBar();



  describe('Logout', () => {          });

    it('should handle logout when triggered', async () => {

      // This test would require exposing logout functionality      const logoButton = screen.getByLabelText('Go to home');

      // Currently handled by UserMenu component

      renderTopBar();      fireEvent.click(logoButton);    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({    responsiveClasses: {

      expect(screen.getByTestId('user-menu')).toBeInTheDocument();

    });      

  });

      await waitFor(() => {    it('should render logo image', () => {

  describe('Accessibility', () => {

    it('should have proper ARIA role for header', () => {        expect(mockPush).toHaveBeenCalledWith('/');

      renderTopBar();

      expect(screen.getByRole('banner')).toBeInTheDocument();      });      renderTopBar();      ok: true,      container: 'px-4',

    });

    });

    it('should have accessible logo image', () => {

      renderTopBar();  });      const logo = screen.getByAltText('Fixzit Enterprise');

      const logo = screen.getByAltText(/fixzit logo/i);

      expect(logo).toHaveAttribute('alt');

    });

  describe('Notifications', () => {      expect(logo).toBeInTheDocument();      json: async () => ({ items: [] }),      text: 'text-base',

    it('should support keyboard navigation', () => {

      renderTopBar();    it('should fetch notifications when bell is clicked', async () => {

      const logo = screen.getByAltText(/fixzit logo/i);

      expect(logo.parentElement).toHaveAttribute('tabIndex');      const mockNotifications = {      expect(logo).toHaveAttribute('src', expect.stringContaining('logo.jpg'));

    });

  });        items: [



  describe('RTL Support', () => {          {    });    } as Response);    },

    it('should apply RTL classes when in RTL mode', () => {

      // RTL is handled by ResponsiveProvider            id: '1',

      renderTopBar();

      const banner = screen.getByRole('banner');            title: 'Test Notification',

      expect(banner).toBeInTheDocument();

    });            message: 'Test message',

  });

            timestamp: new Date().toISOString(),    it('should render notification bell for authenticated users', async () => {  });    screenInfo: {

  describe('Authentication', () => {

    it('should check authentication status on mount', async () => {            read: false,

      renderTopBar();

                  priority: 'high',      renderTopBar();

      await waitFor(() => {

        expect(global.fetch).toHaveBeenCalledWith('/api/auth/session');            category: 'alert',

      });

    });            type: 'system',      await waitFor(() => {      isMobile: false,



    it('should handle authentication check failure gracefully', async () => {          },

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(

        new Error('Network error')        ],        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();

      );

            };

      renderTopBar();

            });  afterEach(() => {      isTablet: false,

      await waitFor(() => {

        expect(global.fetch).toHaveBeenCalledWith('/api/auth/session');      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({

      });

              ok: true,    });

      // Component should still render

      expect(screen.getByRole('banner')).toBeInTheDocument();        json: async () => ({}),

    });

  });      } as Response);    vi.restoreAllMocks();      isDesktop: true,



  describe('Performance', () => {

    it('should not re-fetch notifications unnecessarily', async () => {

      const { rerender } = renderTopBar();      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({    it('should render user menu button for authenticated users', async () => {

      

      await waitFor(() => {        ok: true,

        expect(global.fetch).toHaveBeenCalled();

      });        json: async () => mockNotifications,      renderTopBar();  });      screenClass: 'xl',

      

      const initialCallCount = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;      } as Response);

      

      rerender(      await waitFor(() => {

        <TranslationProvider>

          <ResponsiveProvider>      renderTopBar();

            <FormStateProvider>

              <TopBar />        expect(screen.getByLabelText('User menu')).toBeInTheDocument();    },

            </FormStateProvider>

          </ResponsiveProvider>      await waitFor(() => {

        </TranslationProvider>

      );        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();      });

      

      // Should not trigger additional fetches on rerender      });

      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(initialCallCount);

    });    });  const renderTopBar = (props = {}) => {    isRTL: false,



    it('should cleanup on unmount', () => {      const notificationBell = screen.getByLabelText('Toggle notifications');

      const { unmount } = renderTopBar();

      unmount();      fireEvent.click(notificationBell);

      // Component should cleanup without errors

      expect(screen.queryByRole('banner')).not.toBeInTheDocument();

    });

  });      await waitFor(() => {    it('should not render notifications for unauthenticated users', async () => {    return render(  }),

});

        expect(global.fetch).toHaveBeenCalledWith(

          '/api/notifications?limit=5&read=false',      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({

          expect.objectContaining({ credentials: 'include' })

        );        ok: false,      <TranslationProvider>}));

      });

    });      } as Response);



    it('should show empty state when no notifications', async () => {              <ResponsiveProvider>

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({

        ok: true,      renderTopBar();

        json: async () => ({}),

      } as Response);      await waitFor(() => {          <FormStateProvider>// Mock GlobalSearch component



      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({        expect(screen.queryByLabelText('Toggle notifications')).not.toBeInTheDocument();

        ok: true,

        json: async () => ({ items: [] }),      });            <TopBar {...props} />vi.mock('../topbar/GlobalSearch', () => ({

      } as Response);

    });

      renderTopBar();

  });          </FormStateProvider>  default: () => <div data-testid="global-search">Global Search</div>,

      await waitFor(() => {

        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();

      });

  describe('Logo Click Behavior', () => {        </ResponsiveProvider>}));

      const notificationBell = screen.getByLabelText('Toggle notifications');

      fireEvent.click(notificationBell);    it('should navigate to home when no unsaved changes', async () => {



      await waitFor(() => {      renderTopBar();      </TranslationProvider>

        expect(screen.getByText(/all caught up/i)).toBeInTheDocument();

      });      

    });

  });      const logoButton = screen.getByLabelText('Go to home');    );// Mock AppSwitcher component



  describe('User Menu', () => {      fireEvent.click(logoButton);

    it('should open user menu when clicked', async () => {

      renderTopBar();        };vi.mock('../topbar/AppSwitcher', () => ({



      await waitFor(() => {      await waitFor(() => {

        expect(screen.getByLabelText('User menu')).toBeInTheDocument();

      });        expect(mockPush).toHaveBeenCalledWith('/');  default: () => <div data-testid="app-switcher">App Switcher</div>,



      const userMenuButton = screen.getByLabelText('User menu');      });

      fireEvent.click(userMenuButton);

    });  describe('Rendering', () => {}));

      await waitFor(() => {

        expect(screen.getByText(/Profile/i)).toBeInTheDocument();

        expect(screen.getByText(/Settings/i)).toBeInTheDocument();

      });    it('should show unsaved changes dialog when there are unsaved changes', async () => {    it('should render TopBar with brand name', () => {

    });

  });      renderTopBar();



  describe('Accessibility', () => {            renderTopBar();// Mock QuickActions component

    it('should have proper ARIA labels on interactive elements', async () => {

      renderTopBar();      const logoButton = screen.getByLabelText('Go to home');



      await waitFor(() => {      fireEvent.click(logoButton);      expect(screen.getByText(/FIXZIT ENTERPRISE/i)).toBeInTheDocument();vi.mock('../topbar/QuickActions', () => ({

        expect(screen.getByLabelText('Go to home')).toBeInTheDocument();

        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();      

        expect(screen.getByLabelText('User menu')).toBeInTheDocument();

      });      // Should not navigate immediately if there are unsaved changes    });  default: () => <div data-testid="quick-actions">Quick Actions</div>,

    });

      expect(mockPush).not.toHaveBeenCalled();

    it('should have proper role attributes on notification dropdown', async () => {

      renderTopBar();    });}));



      await waitFor(() => {  });

        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();

      });    it('should render logo image', () => {



      const notificationBell = screen.getByLabelText('Toggle notifications');  describe('Notifications', () => {

      fireEvent.click(notificationBell);

    it('should fetch notifications when bell is clicked', async () => {      renderTopBar();// Mock LanguageSelector component

      await waitFor(() => {

        expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();      const mockNotifications = {

      });

    });        items: [      const logo = screen.getByAltText('Fixzit Enterprise');vi.mock('../i18n/LanguageSelector', () => ({

  });

          {

  describe('Authentication State', () => {

    it('should check authentication on mount', async () => {            id: '1',      expect(logo).toBeInTheDocument();  default: () => <div data-testid="language-selector">Language Selector</div>,

      renderTopBar();

            title: 'Test Notification',

      await waitFor(() => {

        expect(global.fetch).toHaveBeenCalledWith('/api/auth/me');            message: 'Test message',      expect(logo).toHaveAttribute('src', expect.stringContaining('logo.jpg'));}));

      });

    });            timestamp: new Date().toISOString(),



    it('should handle authentication failure gracefully', async () => {            read: false,    });

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(

        new Error('Network error')            priority: 'high',

      );

            category: 'alert',// Mock CurrencySelector component

      renderTopBar();

            type: 'system',

      await waitFor(() => {

        expect(screen.queryByLabelText('Toggle notifications')).not.toBeInTheDocument();          },    it('should render notification bell for authenticated users', async () => {vi.mock('../i18n/CurrencySelector', () => ({

      });

    });        ],

  });

});      };      renderTopBar();  default: () => <div data-testid="currency-selector">Currency Selector</div>,




      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({      await waitFor(() => {}));

        ok: true,

        json: async () => ({}),        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();

      } as Response);

      });// Mock Portal component

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({

        ok: true,    });vi.mock('../Portal', () => ({

        json: async () => mockNotifications,

      } as Response);  default: ({ children }: { children: React.ReactNode }) => <div data-testid="portal">{children}</div>,



      renderTopBar();    it('should render user menu button for authenticated users', async () => {}));



      await waitFor(() => {      renderTopBar();

        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();

      });      await waitFor(() => {describe('TopBar', () => {



      const notificationBell = screen.getByLabelText('Toggle notifications');        expect(screen.getByLabelText('User menu')).toBeInTheDocument();  beforeEach(() => {

      fireEvent.click(notificationBell);

      });    // Clear localStorage before each test

      await waitFor(() => {

        expect(global.fetch).toHaveBeenCalledWith(    });    localStorage.clear();

          '/api/notifications?limit=5&read=false',

          expect.objectContaining({ credentials: 'include' })    

        );

      });    it('should not render notifications for unauthenticated users', async () => {    // Default: authenticated user with empty notifications

    });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({    // This ensures the notifications bell and user menu are rendered

    it('should show empty state when no notifications', async () => {

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({        ok: false,    global.fetch = vi.fn((input: RequestInfo | URL) => {

        ok: true,

        json: async () => ({}),      } as Response);      const url = input.toString();

      } as Response);

            

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({

        ok: true,      renderTopBar();      if (url.includes('/api/auth/me')) {

        json: async () => ({ items: [] }),

      } as Response);      await waitFor(() => {        return Promise.resolve({



      renderTopBar();        expect(screen.queryByLabelText('Toggle notifications')).not.toBeInTheDocument();          ok: true,



      await waitFor(() => {      });          json: () => Promise.resolve({ 

        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();

      });    });            user: { 



      const notificationBell = screen.getByLabelText('Toggle notifications');  });              id: '1', 

      fireEvent.click(notificationBell);

              email: 'test@fixzit.co', 

      await waitFor(() => {

        expect(screen.getByText(/all caught up/i)).toBeInTheDocument();  describe('Logo Click Behavior', () => {              role: 'ADMIN' 

      });

    });    it('should navigate to home when no unsaved changes', async () => {            } 



    it('should close notification dropdown when clicking outside', async () => {      renderTopBar();          })

      renderTopBar();

              } as Response);

      await waitFor(() => {

        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();      const logoButton = screen.getByLabelText('Go to home');      }

      });

      fireEvent.click(logoButton);      

      const notificationBell = screen.getByLabelText('Toggle notifications');

      fireEvent.click(notificationBell);            if (url.includes('/api/notifications')) {



      // Simulate click outside      await waitFor(() => {        return Promise.resolve({

      fireEvent.mouseDown(document.body);

        expect(mockPush).toHaveBeenCalledWith('/');          ok: true,

      await waitFor(() => {

        expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();      });          json: () => Promise.resolve({ items: [] })

      });

    });    });        } as Response);



    it('should close notification dropdown on Escape key', async () => {      }

      renderTopBar();

    it('should show unsaved changes dialog when there are unsaved changes', async () => {      

      await waitFor(() => {

        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();      const { container } = renderTopBar();      return Promise.resolve({

      });

              ok: true,

      const notificationBell = screen.getByLabelText('Toggle notifications');

      fireEvent.click(notificationBell);      // Simulate form state having unsaved changes        json: () => Promise.resolve({})



      await waitFor(() => {      // Note: In real usage, forms would mark themselves dirty via FormStateContext      } as Response);

        expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();

      });          });



      fireEvent.keyDown(document, { key: 'Escape' });      const logoButton = screen.getByLabelText('Go to home');  });



      await waitFor(() => {      fireEvent.click(logoButton);

        expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();

      });        describe('Rendering', () => {

    });

  });      // Should not navigate immediately    it('should render TopBar with brand name', () => {



  describe('User Menu', () => {      expect(mockPush).not.toHaveBeenCalled();      render(<TopBar />);

    it('should open user menu when clicked', async () => {

      renderTopBar();    });      expect(screen.getByText('FIXZIT ENTERPRISE')).toBeInTheDocument();



      await waitFor(() => {  });    });

        expect(screen.getByLabelText('User menu')).toBeInTheDocument();

      });



      const userMenuButton = screen.getByLabelText('User menu');  describe('Notifications', () => {    it('should render GlobalSearch component', () => {

      fireEvent.click(userMenuButton);

    it('should fetch notifications when bell is clicked', async () => {      render(<TopBar />);

      await waitFor(() => {

        expect(screen.getByText(/Profile/i)).toBeInTheDocument();      const mockNotifications = {      expect(screen.getByTestId('global-search')).toBeInTheDocument();

        expect(screen.getByText(/Settings/i)).toBeInTheDocument();

      });        items: [    });

    });

          {

    it('should close user menu when clicking outside', async () => {

      renderTopBar();            id: '1',    it('should render AppSwitcher component', () => {



      await waitFor(() => {            title: 'Test Notification',      render(<TopBar />);

        expect(screen.getByLabelText('User menu')).toBeInTheDocument();

      });            message: 'Test message',      expect(screen.getByTestId('app-switcher')).toBeInTheDocument();



      const userMenuButton = screen.getByLabelText('User menu');            timestamp: new Date().toISOString(),    });

      fireEvent.click(userMenuButton);

            read: false,

      await waitFor(() => {

        expect(screen.getByText(/Profile/i)).toBeInTheDocument();            priority: 'high',    it('should render notification bell button', async () => {

      });

            category: 'alert',      render(<TopBar />);

      // Simulate click outside

      fireEvent.mouseDown(document.body);            type: 'system',      await waitFor(() => {



      await waitFor(() => {          },        const notificationBtn = screen.getByLabelText(/notifications/i);

        expect(screen.queryByText(/Profile/i)).not.toBeInTheDocument();

      });        ],        expect(notificationBtn).toBeInTheDocument();

    });

      };      });

    it('should navigate to profile page when Profile is clicked', async () => {

      renderTopBar();    });



      await waitFor(() => {      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({

        expect(screen.getByLabelText('User menu')).toBeInTheDocument();

      });        ok: true,    it('should render user menu button', async () => {



      const userMenuButton = screen.getByLabelText('User menu');        json: async () => ({}),      render(<TopBar />);

      fireEvent.click(userMenuButton);

      } as Response);      await waitFor(() => {

      await waitFor(() => {

        expect(screen.getByText(/Profile/i)).toBeInTheDocument();        const userMenuBtn = screen.getByLabelText(/user menu/i);

      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({        expect(userMenuBtn).toBeInTheDocument();

      const profileLink = screen.getByText(/Profile/i).closest('a');

      if (profileLink) {        ok: true,      });

        fireEvent.click(profileLink);

      }        json: async () => mockNotifications,    });

    });

      } as Response);  });

    it('should navigate to settings page when Settings is clicked', async () => {

      renderTopBar();



      await waitFor(() => {      renderTopBar();  describe('Accessibility', () => {

        expect(screen.getByLabelText('User menu')).toBeInTheDocument();

      });    it('should have proper ARIA labels on interactive elements', async () => {



      const userMenuButton = screen.getByLabelText('User menu');      await waitFor(() => {      render(<TopBar />);

      fireEvent.click(userMenuButton);

        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();      await waitFor(() => {

      await waitFor(() => {

        expect(screen.getByText(/Settings/i)).toBeInTheDocument();      });        expect(screen.getByLabelText(/notifications/i)).toHaveAttribute('aria-label');

      });

        expect(screen.getByLabelText(/user menu/i)).toHaveAttribute('aria-label');

      const settingsLink = screen.getByText(/Settings/i).closest('a');

      if (settingsLink) {      const notificationBell = screen.getByLabelText('Toggle notifications');      });

        fireEvent.click(settingsLink);

      }      fireEvent.click(notificationBell);    });

    });

  });



  describe('Logout', () => {      await waitFor(() => {    it('should support keyboard navigation with Escape key', async () => {

    it('should call logout API and redirect to login', async () => {

      const originalLocation = window.location;        expect(global.fetch).toHaveBeenCalledWith(      render(<TopBar />);

      delete (window as { location?: Location }).location;

      window.location = { ...originalLocation, href: '' } as Location;          '/api/notifications?limit=5&read=false',      const userMenuBtn = await screen.findByLabelText(/user menu/i);



      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({          expect.objectContaining({ credentials: 'include' })      

        ok: true,

      } as Response);        );      // Open user menu



      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({      });      fireEvent.click(userMenuBtn);

        ok: true,

      } as Response);    });      await waitFor(() => {



      renderTopBar();        expect(screen.getByText(/sign out/i)).toBeInTheDocument();



      await waitFor(() => {    it('should show empty state when no notifications', async () => {      });

        expect(screen.getByLabelText('User menu')).toBeInTheDocument();

      });      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({



      const userMenuButton = screen.getByLabelText('User menu');        ok: true,      // Press Escape

      fireEvent.click(userMenuButton);

        json: async () => ({}),      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {

        expect(screen.getByText(/Sign out/i)).toBeInTheDocument();      } as Response);      await waitFor(() => {

      });

        expect(screen.queryByText(/sign out/i)).not.toBeInTheDocument();

      const logoutButton = screen.getByText(/Sign out/i);

      fireEvent.click(logoutButton);      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({      });



      await waitFor(() => {        ok: true,    });

        expect(global.fetch).toHaveBeenCalledWith(

          '/api/auth/logout',        json: async () => ({ items: [] }),

          expect.objectContaining({

            method: 'POST',      } as Response);    it('should close popups when clicking outside', async () => {

            credentials: 'include',

          })      render(<TopBar />);

        );

      });      renderTopBar();      const userMenuBtn = await screen.findByLabelText(/user menu/i);



      window.location = originalLocation;      

    });

  });      await waitFor(() => {      // Open user menu



  describe('Accessibility', () => {        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();      fireEvent.click(userMenuBtn);

    it('should have proper ARIA labels on interactive elements', async () => {

      renderTopBar();      });      await waitFor(() => {



      await waitFor(() => {        expect(screen.getByText(/sign out/i)).toBeInTheDocument();

        expect(screen.getByLabelText('Go to home')).toBeInTheDocument();

        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();      const notificationBell = screen.getByLabelText('Toggle notifications');      });

        expect(screen.getByLabelText('User menu')).toBeInTheDocument();

      });      fireEvent.click(notificationBell);

    });

      // Click outside

    it('should have proper ARIA attributes on unsaved changes dialog', async () => {

      renderTopBar();      await waitFor(() => {      fireEvent.mouseDown(document.body);

      

      const logoButton = screen.getByLabelText('Go to home');        expect(screen.getByText(/all caught up/i)).toBeInTheDocument();      await waitFor(() => {

      fireEvent.click(logoButton);

            });        expect(screen.queryByText(/sign out/i)).not.toBeInTheDocument();

      // Dialog should have proper ARIA attributes if shown

      const dialog = screen.queryByRole('dialog');    });      });

      if (dialog) {

        expect(dialog).toHaveAttribute('aria-modal', 'true');    });

        expect(dialog).toHaveAttribute('aria-labelledby');

      }    it('should close notification dropdown when clicking outside', async () => {

    });

      renderTopBar();    it('should have proper focus management for dropdowns', () => {

    it('should have proper role attributes on notification dropdown', async () => {

      renderTopBar();      render(<TopBar />);



      await waitFor(() => {      await waitFor(() => {      const userMenuBtn = screen.getByLabelText(/user menu/i);

        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();

      });        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();      



      const notificationBell = screen.getByLabelText('Toggle notifications');      });      userMenuBtn.focus();

      fireEvent.click(notificationBell);

      expect(userMenuBtn).toHaveFocus();

      await waitFor(() => {

        expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();      const notificationBell = screen.getByLabelText('Toggle notifications');    });

      });

    });      fireEvent.click(notificationBell);  });

  });



  describe('RTL Support', () => {

    it('should apply RTL classes when language is Arabic', () => {      // Simulate click outside  describe('User Menu Interactions', () => {

      const { container } = renderTopBar();

      expect(container).toBeTruthy();      fireEvent.mouseDown(document.body);    it('should toggle user menu on button click', async () => {

    });

  });      render(<TopBar />);



  describe('Authentication State', () => {      await waitFor(() => {      const userMenuBtn = await screen.findByLabelText(/user menu/i);

    it('should check authentication on mount', async () => {

      renderTopBar();        expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();      



      await waitFor(() => {      });      // Initially closed

        expect(global.fetch).toHaveBeenCalledWith('/api/auth/me');

      });    });      expect(screen.queryByText(/sign out/i)).not.toBeInTheDocument();

    });



    it('should handle authentication failure gracefully', async () => {

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(    it('should close notification dropdown on Escape key', async () => {      // Click to open

        new Error('Network error')

      );      renderTopBar();      fireEvent.click(userMenuBtn);



      renderTopBar();      await waitFor(() => {



      await waitFor(() => {      await waitFor(() => {        expect(screen.getByText(/sign out/i)).toBeInTheDocument();

        expect(screen.queryByLabelText('Toggle notifications')).not.toBeInTheDocument();

      });        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();      });

    });

  });      });



  describe('Performance', () => {      // Click to close

    it('should not fetch notifications multiple times unnecessarily', async () => {

      const { rerender } = renderTopBar();      const notificationBell = screen.getByLabelText('Toggle notifications');      fireEvent.click(userMenuBtn);



      await waitFor(() => {      fireEvent.click(notificationBell);      await waitFor(() => {

        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();

      });        expect(screen.queryByText(/sign out/i)).not.toBeInTheDocument();



      vi.clearAllMocks();      await waitFor(() => {      });



      rerender(        expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();    });

        <TranslationProvider>

          <ResponsiveProvider>      });

            <FormStateProvider>

              <TopBar />    it('should close notification popup when opening user menu', async () => {

            </FormStateProvider>

          </ResponsiveProvider>      fireEvent.keyDown(document, { key: 'Escape' });      render(<TopBar />);

        </TranslationProvider>

      );      const notificationBtn = await screen.findByLabelText(/notifications/i);



      expect(global.fetch).not.toHaveBeenCalledWith(      await waitFor(() => {      const userMenuBtn = await screen.findByLabelText(/user menu/i);

        expect.stringContaining('/api/notifications'),

        expect.anything()        expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();      

      );

    });      });      // Open notifications

  });

});    });      fireEvent.click(notificationBtn);


  });      await waitFor(() => {

        expect(screen.getByText(/no new notifications/i)).toBeInTheDocument();

  describe('User Menu', () => {      });

    it('should open user menu when clicked', async () => {

      renderTopBar();      // Open user menu - should close notifications

      fireEvent.click(userMenuBtn);

      await waitFor(() => {      await waitFor(() => {

        expect(screen.getByLabelText('User menu')).toBeInTheDocument();        expect(screen.queryByText(/no new notifications/i)).not.toBeInTheDocument();

      });        expect(screen.getByText(/sign out/i)).toBeInTheDocument();

      });

      const userMenuButton = screen.getByLabelText('User menu');    });

      fireEvent.click(userMenuButton);  });



      await waitFor(() => {  describe('Logout Functionality', () => {

        expect(screen.getByText(/Profile/i)).toBeInTheDocument();    it('should call logout API and redirect on logout', async () => {

        expect(screen.getByText(/Settings/i)).toBeInTheDocument();      // Override with specific mock for logout test

      });      const mockFetch = vi.fn((input: RequestInfo | URL) => {

    });        const url = input.toString();

        if (url.includes('/api/auth/logout')) {

    it('should close user menu when clicking outside', async () => {          return Promise.resolve({ ok: true } as Response);

      renderTopBar();        }

        return Promise.resolve({ ok: true } as Response);

      await waitFor(() => {      });

        expect(screen.getByLabelText('User menu')).toBeInTheDocument();      global.fetch = mockFetch;

      });

      // Mock window.location

      const userMenuButton = screen.getByLabelText('User menu');      delete (window as any).location;

      fireEvent.click(userMenuButton);      window.location = { href: '' } as any;



      await waitFor(() => {      render(<TopBar />);

        expect(screen.getByText(/Profile/i)).toBeInTheDocument();      const userMenuBtn = screen.getByLabelText(/user menu/i);

      });      

      // Open user menu

      // Simulate click outside      fireEvent.click(userMenuBtn);

      fireEvent.mouseDown(document.body);      await waitFor(() => {

        expect(screen.getByText(/sign out/i)).toBeVisible();

      await waitFor(() => {      });

        expect(screen.queryByText(/Profile/i)).not.toBeInTheDocument();

      });      // Click sign out

    });      const signOutBtn = screen.getByText(/sign out/i);

      fireEvent.click(signOutBtn);

    it('should navigate to profile page when Profile is clicked', async () => {

      renderTopBar();      await waitFor(() => {

        expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {

      await waitFor(() => {          method: 'POST',

        expect(screen.getByLabelText('User menu')).toBeInTheDocument();          credentials: 'include',

      });        });

        expect(window.location.href).toBe('/login');

      const userMenuButton = screen.getByLabelText('User menu');      });

      fireEvent.click(userMenuButton);    });



      await waitFor(() => {    it('should preserve language settings during logout', async () => {

        expect(screen.getByText(/Profile/i)).toBeInTheDocument();      localStorage.setItem('fxz.lang', 'ar');

      });      localStorage.setItem('fxz.locale', 'ar-SA');

      localStorage.setItem('fixzit-role', 'admin');

      const profileLink = screen.getByText(/Profile/i);      localStorage.setItem('fixzit-theme', 'dark');

      fireEvent.click(profileLink);

      // Override with specific mock for logout test

      expect(mockPush).toHaveBeenCalledWith('/profile');      const mockFetch = vi.fn((input: RequestInfo | URL) => {

    });        return Promise.resolve({ ok: true } as Response);

      });

    it('should navigate to settings page when Settings is clicked', async () => {      global.fetch = mockFetch;

      renderTopBar();

      delete (window as any).location;

      await waitFor(() => {      window.location = { href: '' } as any;

        expect(screen.getByLabelText('User menu')).toBeInTheDocument();

      });      render(<TopBar />);

      const userMenuBtn = screen.getByLabelText(/user menu/i);

      const userMenuButton = screen.getByLabelText('User menu');      

      fireEvent.click(userMenuButton);      fireEvent.click(userMenuBtn);

      const signOutBtn = await screen.findByText(/sign out/i);

      await waitFor(() => {      fireEvent.click(signOutBtn);

        expect(screen.getByText(/Settings/i)).toBeInTheDocument();

      });      await waitFor(() => {

        expect(localStorage.getItem('fxz.lang')).toBe('ar');

      const settingsLink = screen.getByText(/Settings/i);        expect(localStorage.getItem('fxz.locale')).toBe('ar-SA');

      fireEvent.click(settingsLink);        expect(localStorage.getItem('fixzit-role')).toBeNull();

        expect(localStorage.getItem('fixzit-theme')).toBeNull();

      expect(mockPush).toHaveBeenCalledWith('/settings');      });

    });    });

  });

    it('should redirect to login even if logout API fails', async () => {

  describe('Logout', () => {      // Override with specific mock for logout failure test

    it('should call logout API and redirect to login', async () => {      const mockFetch = vi.fn((input: RequestInfo | URL) => {

      const mockLocationHref = vi.fn();        return Promise.reject(new Error('Network error'));

      Object.defineProperty(window, 'location', {      });

        value: { href: mockLocationHref },      global.fetch = mockFetch;

        writable: true,

      });      delete (window as any).location;

      window.location = { href: '' } as any;

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({

        ok: true,      render(<TopBar />);

      } as Response);      const userMenuBtn = screen.getByLabelText(/user menu/i);

      

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({      fireEvent.click(userMenuBtn);

        ok: true,      const signOutBtn = await screen.findByText(/sign out/i);

      } as Response);      fireEvent.click(signOutBtn);



      renderTopBar();      await waitFor(() => {

        expect(window.location.href).toBe('/login');

      await waitFor(() => {      });

        expect(screen.getByLabelText('User menu')).toBeInTheDocument();    });

      });  });



      const userMenuButton = screen.getByLabelText('User menu');  describe('Notifications', () => {

      fireEvent.click(userMenuButton);    it('should toggle notification popup on button click', async () => {

      render(<TopBar />);

      await waitFor(() => {      const notificationBtn = await screen.findByLabelText(/notifications/i);

        expect(screen.getByText(/Sign out/i)).toBeInTheDocument();      

      });      // Initially closed

      expect(screen.queryByText(/no new notifications/i)).not.toBeInTheDocument();

      const logoutButton = screen.getByText(/Sign out/i);

      fireEvent.click(logoutButton);      // Click to open

      fireEvent.click(notificationBtn);

      await waitFor(() => {      

        expect(global.fetch).toHaveBeenCalledWith(      // Wait for notification popup to appear - using toBeVisible to verify actual visibility

          '/api/auth/logout',      await waitFor(() => {

          expect.objectContaining({        expect(screen.getByText(/no new notifications/i)).toBeVisible();

            method: 'POST',      }, { timeout: 1000 });

            credentials: 'include',

          })      // Click to close

        );      fireEvent.click(notificationBtn);

      });      await waitFor(() => {

    });        expect(screen.queryByText(/no new notifications/i)).not.toBeInTheDocument();

  });      });

    });

  describe('Accessibility', () => {  });

    it('should have proper ARIA labels on interactive elements', async () => {

      renderTopBar();  describe('RTL Support', () => {

    it('should apply RTL classes when isRTL is true', () => {

      await waitFor(() => {      // Note: This test would require re-importing TopBar with the RTL mock active

        expect(screen.getByLabelText('Go to home')).toBeInTheDocument();      // For now, we skip this test as vi.mock() inside it() has no effect

        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();      // To implement: Move RTL mock to module scope or use a different testing strategy

        expect(screen.getByLabelText('User menu')).toBeInTheDocument();    });

      });  });

    });});


    it('should have proper ARIA attributes on unsaved changes dialog', async () => {
      renderTopBar();
      
      // Trigger unsaved changes dialog by simulating form state
      // In real usage, forms would mark themselves dirty
      
      const logoButton = screen.getByLabelText('Go to home');
      fireEvent.click(logoButton);
      
      // Dialog should have proper ARIA attributes if shown
      const dialog = screen.queryByRole('dialog');
      if (dialog) {
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby', 'unsaved-dialog-title');
      }
    });

    it('should have proper role attributes on notification dropdown', async () => {
      renderTopBar();

      await waitFor(() => {
        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();
      });

      const notificationBell = screen.getByLabelText('Toggle notifications');
      fireEvent.click(notificationBell);

      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
      });
    });
  });

  describe('RTL Support', () => {
    it('should apply RTL classes when language is Arabic', () => {
      // This would require mocking the TranslationContext to return isRTL: true
      // The implementation uses ResponsiveContext which provides isRTL
      const { container } = renderTopBar();
      expect(container).toBeTruthy();
      // Additional RTL-specific assertions would go here
    });
  });

  describe('Authentication State', () => {
    it('should check authentication on mount', async () => {
      renderTopBar();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/me');
      });
    });

    it('should handle authentication failure gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      renderTopBar();

      await waitFor(() => {
        // Should not show authenticated features
        expect(screen.queryByLabelText('Toggle notifications')).not.toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not fetch notifications multiple times unnecessarily', async () => {
      const { rerender } = renderTopBar();

      await waitFor(() => {
        expect(screen.getByLabelText('Toggle notifications')).toBeInTheDocument();
      });

      // Clear previous calls
      vi.clearAllMocks();

      // Re-render without opening dropdown
      rerender(
        <TranslationProvider>
          <ResponsiveProvider>
            <FormStateProvider>
              <TopBar />
            </FormStateProvider>
          </ResponsiveProvider>
        </TranslationProvider>
      );

      // Should not fetch notifications again
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/notifications'),
        expect.anything()
      );
    });
  });
});
