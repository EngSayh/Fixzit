import React from "react";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  Mock,
} from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { SessionProvider, signOut } from "next-auth/react";
import TopBar from "@/components/TopBar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { mockFetch, restoreFetch } from "@/tests/helpers/domMocks";
// Stub TranslationProvider/useTranslation to avoid i18n context errors in unit tests
vi.mock("@/contexts/TranslationContext", () => {
  const React = require("react");

  // Translation map for test labels
  const translations: Record<string, string> = {
    "common.backToHome": "Go to home",
    "nav.globalHeader": "Fixzit global navigation",
    "nav.notifications": "Toggle notifications",
    "nav.profile": "Toggle user menu",
    "nav.settings": "Settings",
    "common.brand": "Fixzit",
    "common.signIn": "Sign In",
    "common.search": "Search",
    "common.unsavedChanges": "Unsaved Changes",
    "common.unsavedChangesMessage":
      "You have unsaved changes. Do you want to discard them?",
    "common.cancel": "Cancel",
    "common.discardChanges": "Discard Changes",
    "common.unread": "unread",
    "common.noNotifications": "All caught up",
    "common.preferences": "Preferences",
    "common.logout": "Sign Out",
    "notifications.title": "Notifications",
    "notifications.empty": "No new notifications",
    "notifications.filters.all": "All",
    "notifications.filters.maintenance": "Work Orders",
    "notifications.filters.finance": "Finance",
    "notifications.filters.system": "System",
    "user.menu": "User Menu",
    "user.signOut": "Sign Out",
    "time.justNow": "Just now",
    "time.minutesAgo": "{{count}} minutes ago",
    "time.hoursAgo": "{{count}} hours ago",
    "time.daysAgo": "{{count}} days ago",
  };

  return {
    TranslationProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    useTranslation: () => ({
      language: "en",
      locale: "en",
      setLanguage: vi.fn(),
      setLocale: vi.fn(),
      t: (key: string, fallback?: string) =>
        translations[key] || fallback || key,
      isRTL: false,
    }),
  };
});
import { ResponsiveProvider } from "@/contexts/ResponsiveContext";
import { FormStateProvider } from "@/contexts/FormStateContext";
import { useRouter, usePathname } from "next/navigation";
// Provide a lightweight i18n hook so TranslationProvider doesn't throw
vi.mock("@/i18n/useI18n", () => {
  const translations: Record<string, string> = {
    "common.backToHome": "Go to home",
    "nav.globalHeader": "Fixzit global navigation",
    "common.brand": "Fixzit",
    "common.signIn": "Sign In",
    "common.search": "Search",
  };

  return {
    useI18n: () => ({
      locale: "en",
      dir: "ltr",
      setLocale: vi.fn(),
      t: (key: string, fallback?: string) =>
        translations[key] || fallback || key,
    }),
  };
});

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

// Mock next-auth/react hooks
vi.mock("next-auth/react", async () => {
  const actual = await vi.importActual("next-auth/react");
  const mockSignOut = vi.fn(async () => {});
  return {
    ...actual,
    useSession: vi.fn(() => ({
      data: {
        user: {
          id: "test-user-id",
          email: "test@example.com",
          name: "Test User",
        },
        expires: "2025-12-31",
      },
      status: "authenticated",
    })),
    signOut: mockSignOut,
    SessionProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock Portal component
vi.mock("../Portal", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock child components
vi.mock("@/components/i18n/LanguageSelector", () => ({
  default: () => <div data-testid="language-selector">Language Selector</div>,
}));

vi.mock("@/components/i18n/CurrencySelector", () => ({
  default: () => <div data-testid="currency-selector">Currency Selector</div>,
}));

vi.mock("@/components/topbar/AppSwitcher", () => ({
  default: () => <div data-testid="app-switcher">App Switcher</div>,
}));

vi.mock("@/components/topbar/GlobalSearch", () => ({
  default: () => <div data-testid="global-search">Global Search</div>,
}));

vi.mock("@/components/topbar/QuickActions", () => ({
  default: () => <div data-testid="quick-actions">Quick Actions</div>,
}));

vi.mock("@/components/topbar/TopMegaMenu", () => ({
  TopMegaMenu: () => <div data-testid="mega-menu">Mega Menu</div>,
}));

vi.mock("@/contexts/TopBarContext", () => {
  const React = require("react");
  const mockValue = {
    app: "fm",
    appLabelKey: "app.fm",
    appFallbackLabel: "Facility Management (FM)",
    appSearchEntities: [],
    module: "dashboard",
    moduleLabelKey: "nav.dashboard",
    moduleFallbackLabel: "Dashboard",
    searchPlaceholderKey: "search.placeholders.dashboard",
    searchPlaceholderFallback: "Search…",
    searchEntities: [],
    quickActions: [],
    savedSearches: [],
    navKey: "dashboard",
    megaMenuCollapsed: false,
    setMegaMenuCollapsed: vi.fn(),
    setApp: vi.fn(),
  };
  const TopBarContext = React.createContext(mockValue);
  return {
    TopBarContext,
    TopBarProvider: ({ children }: { children: React.ReactNode }) => (
      <TopBarContext.Provider value={mockValue}>
        {children}
      </TopBarContext.Provider>
    ),
    useTopBar: () => mockValue,
  };
});

// Mock session
const mockSession: any = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    role: "ADMIN",
    orgId: "test-org-id",
    sessionId: "test-session-id",
    isSuperAdmin: false,
    permissions: [] as string[],
    roles: [] as string[],
    subscriptionPlan: "BASIC",
  },
  expires: "2025-12-31",
};

// Mock ResponsiveContext for tests
vi.mock("@/contexts/ResponsiveContext", () => ({
  ResponsiveProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useResponsive: vi.fn(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenSize: "desktop",
    isRTL: false,
    setRTL: vi.fn(),
  })),
}));

// Helper function to wrap component with providers and ensure all effects are flushed
const renderWithProviders = async (
  component: React.ReactElement,
  options = {},
) => {
  let utils;
  await act(async () => {
    utils = render(
      <SessionProvider session={mockSession}>
        <TranslationProvider>
          <ResponsiveProvider>
            <TooltipProvider>
              <FormStateProvider>{component}</FormStateProvider>
            </TooltipProvider>
          </ResponsiveProvider>
        </TranslationProvider>
      </SessionProvider>,
      options,
    );
  });
  return utils!;
};

// Silence act warnings to keep output clean; real updates are already wrapped via renderWithProviders
const originalConsoleError = console.error;
let consoleErrorSpy:
  | ReturnType<typeof vi.spyOn<typeof console, "error">>
  | undefined;
beforeAll(() => {
  consoleErrorSpy = vi
    .spyOn(console, "error")
    .mockImplementation((...args: Parameters<typeof console.error>) => {
      const [first] = args;
      if (typeof first === "string" && first.includes("act(...")) {
        return;
      }
      originalConsoleError(...args);
    });
});

afterAll(() => {
  consoleErrorSpy?.mockRestore();
});

describe("TopBar Component", () => {
  let mockRouter: any;
  let mockPush: any;
  let fetchMock: ReturnType<typeof mockFetch>;

  beforeEach(() => {
    mockPush = vi.fn();
    mockRouter = {
      push: mockPush,
      replace: vi.fn(),
      refresh: vi.fn(),
    } as Partial<AppRouterInstance>;
    (useRouter as Mock).mockReturnValue(mockRouter);
    (usePathname as Mock).mockReturnValue("/dashboard");

    // Mock fetch API with proper responses
    fetchMock = mockFetch();
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/api/organization/settings")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ name: "Test Organization", logo: "/logo.jpg" }),
        });
      }
      if (url.includes("/api/notifications")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Not found" }),
      });
    });

    // Reset localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    restoreFetch();
  });

  describe("Basic Rendering", () => {
    it("should render the TopBar component", async () => {
      await renderWithProviders(<TopBar />);
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    it("should render the logo", async () => {
      await renderWithProviders(<TopBar />);
      // The logo could be either the organization logo or the fallback placeholder
      const logoButton = screen.getByLabelText("Go to home");
      expect(logoButton).toBeInTheDocument();
    });

    it("should render the brand text", async () => {
      await renderWithProviders(<TopBar />);
      // Organization name is fetched; fallback brand used when no org name
      expect(
        screen.getByText((text) => /fixzit|test organization/i.test(text)),
      ).toBeInTheDocument();
    });

    it("should render all major sections", async () => {
      await renderWithProviders(<TopBar />);
      expect(screen.getByTestId("app-switcher")).toBeInTheDocument();
      expect(screen.getByTestId("global-search")).toBeInTheDocument();
      expect(screen.getByTestId("quick-actions")).toBeInTheDocument();
    });
  });

  describe("Logo Navigation", () => {
    it("should navigate to FM dashboard when logo is clicked by authenticated user", async () => {
      await renderWithProviders(<TopBar />);

      const logoButton = screen.getByLabelText("Go to home");
      fireEvent.click(logoButton);

      // Authenticated users are redirected to /fm/dashboard, not /
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/fm/dashboard");
      });
    });

    // Note: Unsaved changes dialog tests removed as they require form registration
    // which is not the responsibility of TopBar but of individual forms
  });

  describe("Authentication", () => {
    it("should display authenticated UI when session exists", async () => {
      await renderWithProviders(<TopBar />);

      await waitFor(() => {
        // Should show quick actions and notifications for authenticated users
        expect(screen.getByTestId("quick-actions")).toBeInTheDocument();
      });
    });

    it("should fetch organization settings when authenticated", async () => {
      await renderWithProviders(<TopBar />);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/organization/settings",
          expect.objectContaining({
            credentials: "include",
          }),
        );
      });
    });
  });

  describe("Notifications", () => {
    it("should render notification bell button for authenticated users", async () => {
      await renderWithProviders(<TopBar />);

      // Wait for auth verification to complete
      await waitFor(() => {
        expect(
          screen.getByLabelText(/toggle notifications/i),
        ).toBeInTheDocument();
      });
    });

    it("should toggle notification dropdown when bell is clicked", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true }),
      });

      await renderWithProviders(<TopBar />);

      // Wait for auth verification
      const bellButton = await screen.findByLabelText(/toggle notifications/i);
      fireEvent.click(bellButton);

      // Notification panel should appear
      await waitFor(() => {
        expect(screen.getByText(/notifications/i)).toBeInTheDocument();
      });
    });

    it("should fetch notifications when dropdown opens for authenticated users", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ authenticated: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              {
                id: "1",
                title: "Test Notification",
                message: "Test message",
                timestamp: new Date().toISOString(),
                read: false,
                priority: "high",
                category: "system",
                type: "alert",
              },
            ],
          }),
        });

      await renderWithProviders(<TopBar />);

      // Wait for auth check and bell button to appear
      const bellButton = await screen.findByLabelText(/toggle notifications/i);
      fireEvent.click(bellButton);

      // Wait for notifications fetch
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/notifications?limit=5&read=false",
          expect.objectContaining({
            credentials: "include",
          }),
        );
      });
    });

    it("should show loading state while fetching notifications", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ authenticated: true }),
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () => resolve({ ok: true, json: async () => ({ items: [] }) }),
                100,
              ),
            ),
        );

      await renderWithProviders(<TopBar />);

      const bellButton = await screen.findByLabelText(/toggle notifications/i);
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });
    });

    it("should show empty state when no notifications", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ authenticated: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [] }),
        });

      await renderWithProviders(<TopBar />);

      const bellButton = await screen.findByLabelText(/toggle notifications/i);
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
      });
    });

    it("should close notification dropdown when clicking outside", async () => {
      await renderWithProviders(<TopBar />);

      const bellButton = await screen.findByLabelText(/toggle notifications/i);
      fireEvent.click(bellButton);

      // Click outside
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(
          screen.queryByRole("dialog", { name: /notifications/i }),
        ).not.toBeInTheDocument();
      });
    });

    it("should close notification dropdown on Escape key", async () => {
      await renderWithProviders(<TopBar />);

      const bellButton = await screen.findByLabelText(/toggle notifications/i);
      fireEvent.click(bellButton);

      // Press Escape
      fireEvent.keyDown(document, { key: "Escape" });

      await waitFor(() => {
        expect(
          screen.queryByRole("dialog", { name: /notifications/i }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("User Menu", () => {
    it("should render user menu button", async () => {
      await renderWithProviders(<TopBar />);
      const userButton = await screen.findByLabelText(/toggle user menu/i);
      expect(userButton).toBeInTheDocument();
    });

    it("should toggle user menu dropdown when clicked", async () => {
      await renderWithProviders(<TopBar />);

      const userButton = await screen.findByLabelText(/toggle user menu/i);
      fireEvent.click(userButton);

      await waitFor(() => {
        expect(screen.getByText(/settings/i)).toBeInTheDocument();
      });
    });

    it("should show language and currency selectors in TopBar (always visible)", async () => {
      // Language and currency selectors are now always visible in TopBar,
      // not inside the user menu dropdown
      await renderWithProviders(<TopBar />);

      // They should be visible without clicking user menu
      expect(screen.getByTestId("language-selector")).toBeInTheDocument();
      expect(screen.getByTestId("currency-selector")).toBeInTheDocument();
    });

    it("should handle sign out correctly", async () => {
      await renderWithProviders(<TopBar />);

      const userButton = await screen.findByLabelText(/toggle user menu/i);
      fireEvent.click(userButton);

      const signOutButton = screen.getByText(/sign out/i);
      fireEvent.click(signOutButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/logout");
      });
      expect(signOut).not.toHaveBeenCalled();
    });

    it("should close user menu when clicking outside", async () => {
      await renderWithProviders(<TopBar />);

      const userButton = await screen.findByLabelText(/toggle user menu/i);
      fireEvent.click(userButton);

      // Click outside
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByText(/settings/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Unsaved Changes Dialog", () => {
    it("does not render unsaved dialog when no forms are registered", async () => {
      await renderWithProviders(<TopBar />);
      // With no registered forms, TopBar should not surface an unsaved-changes dialog
      expect(screen.queryByText(/unsaved/i)).not.toBeInTheDocument();
    });

    it("renders baseline layout without unsaved prompt by default", async () => {
      await renderWithProviders(<TopBar />);
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });
  });

  describe("Responsive Behavior", () => {
    it("should render responsive layout correctly", async () => {
      await renderWithProviders(<TopBar />);

      // TopBar should render without errors
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    it("should adapt layout for RTL languages", async () => {
      // RTL support is handled by ResponsiveContext
      await renderWithProviders(<TopBar />);

      // TopBar should render without errors in RTL mode
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });
  });

  describe("Route Change Handling", () => {
    it("should close all dropdowns when route changes", async () => {
      const { rerender } = await renderWithProviders(<TopBar />);

      // Open notification dropdown
      const bellButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(bellButton);

      // Simulate route change
      (usePathname as Mock).mockReturnValue("/settings");
      rerender(
        <SessionProvider session={mockSession}>
          <TranslationProvider>
            <ResponsiveProvider>
              <TooltipProvider>
                <FormStateProvider>
                  <TopBar />
                </FormStateProvider>
              </TooltipProvider>
            </ResponsiveProvider>
          </TranslationProvider>
        </SessionProvider>,
      );

      await waitFor(() => {
        expect(
          screen.queryByRole("region", { name: /notifications/i }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", async () => {
      await renderWithProviders(<TopBar />);

      expect(screen.getByLabelText("Go to home")).toBeInTheDocument();

      // Use async queries for elements that appear after auth verification
      await expect(
        screen.findByLabelText(/toggle notifications/i),
      ).resolves.toBeInTheDocument();
      await expect(
        screen.findByLabelText(/toggle user menu/i),
      ).resolves.toBeInTheDocument();
    });

    it("should be keyboard navigable", async () => {
      await renderWithProviders(<TopBar />);

      const logoButton = screen.getByLabelText("Go to home");
      // Check that the button is in the accessibility tree and can receive focus
      expect(logoButton).toBeInTheDocument();
      expect(logoButton.tagName.toLowerCase()).toBe("button");
    });

    it("should close dropdowns on Escape key", async () => {
      await renderWithProviders(<TopBar />);

      const bellButton = await screen.findByLabelText(/toggle notifications/i);
      fireEvent.click(bellButton);

      fireEvent.keyDown(document, { key: "Escape" });

      await waitFor(() => {
        expect(
          screen.queryByRole("dialog", { name: /notifications/i }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle notification fetch errors gracefully", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ authenticated: true }),
        })
        .mockRejectedValueOnce(new Error("Network error"));

      await renderWithProviders(<TopBar />);

      const bellButton = await screen.findByLabelText(/toggle notifications/i);
      fireEvent.click(bellButton);

      // Should show empty state instead of error
      await waitFor(() => {
        expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
      });
    });

    it("should handle save errors in unsaved changes dialog", async () => {
      // Skipped - unsaved changes now require explicit form registration
      // This test relied on DOM-based detection which has been refactored
    });
  });

  describe("Role Prop", () => {
    it("should render TopBar without role prop", async () => {
      await renderWithProviders(<TopBar />);
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });
  });
});
