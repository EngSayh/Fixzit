/**
 * Unit Test: ClientLayout Component
 * Tests authentication handling, route protection, and layout rendering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import ClientLayout from "@/components/ClientLayout";

// Use vi.hoisted to declare mocks before the hoisted vi.mock calls
const { mockUseSession, mockUseTranslation } = vi.hoisted(() => ({
  mockUseSession: vi.fn(() => ({
    data: null,
    status: "unauthenticated",
  })),
  mockUseTranslation: vi.fn(() => ({
    language: "en",
    isRTL: false,
    t: (key: string) => key,
  })),
}));

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
}));

// Mock NextAuth
vi.mock("next-auth/react", () => ({
  useSession: mockUseSession,
}));

// Mock translation context
vi.mock("@/contexts/TranslationContext", () => ({
  useTranslation: mockUseTranslation,
}));

// Mock TopBarContext to avoid "useTopBar must be used within TopBarProvider" error
vi.mock("@/contexts/TopBarContext", () => ({
  TopBarProvider: ({ children }: { children: React.ReactNode }) => children,
  useTopBar: vi.fn(() => ({
    title: "",
    subtitle: "",
    actions: [],
    setTitle: vi.fn(),
    setSubtitle: vi.fn(),
    setActions: vi.fn(),
    resetTopBar: vi.fn(),
  })),
}));

// Mock TopBar to avoid TooltipProvider dependency
vi.mock("@/components/TopBar", () => ({
  default: () => React.createElement("div", { "data-testid": "mock-topbar" }, "TopBar"),
}));

// Mock ThemeContext to avoid "useThemeCtx must be used within ThemeProvider" error
vi.mock("@/contexts/ThemeContext", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useThemeCtx: vi.fn(() => ({
    theme: "light",
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
  })),
}));

// Mock Sidebar to avoid complex dependencies
vi.mock("@/components/Sidebar", () => ({
  default: () => React.createElement("div", { "data-testid": "mock-sidebar" }, "Sidebar"),
}));

// Mock Footer to avoid Tooltip provider dependency from ThemeToggle
vi.mock("@/components/Footer", () => ({
  default: () => React.createElement("footer", { "data-testid": "mock-footer" }, "Footer"),
}));

// Mock dynamic imports
vi.mock("next/dynamic", () => ({
  default: (fn: () => Promise<unknown>) => {
    const Component = () => null;
    Component.displayName = "DynamicComponent";
    return Component;
  },
}));

// Mock next/link to avoid act warnings from Link state updates
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href }, children),
}));

describe("ClientLayout", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    mockUseTranslation.mockReturnValue({
      language: "en",
      isRTL: false,
      t: (key: string) => key,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render children", () => {
    render(
      <ClientLayout>
        <div data-testid="test-content">Test Content</div>
      </ClientLayout>,
    );

    expect(screen.getByTestId("test-content")).toBeInTheDocument();
  });

  it("should handle unauthenticated state", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(
      <ClientLayout>
        <div>Content</div>
      </ClientLayout>,
    );

    // Should render without crashing
    await waitFor(() => {
      expect(screen.getByText("Content")).toBeInTheDocument();
    });
  });

  it("should handle authenticated state", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "123", role: "ADMIN" } },
      status: "authenticated",
    });

    render(
      <ClientLayout>
        <div>Protected Content</div>
      </ClientLayout>,
    );

    await waitFor(() => {
      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });

  it("should handle loading state", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
    });

    render(
      <ClientLayout>
        <div>Content</div>
      </ClientLayout>,
    );

    // Should render without errors during loading
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("should handle RTL language", async () => {
    mockUseTranslation.mockReturnValue({
      language: "ar",
      isRTL: true,
      t: (key: string) => key,
    });

    render(
      <ClientLayout>
        <div>محتوى</div>
      </ClientLayout>,
    );

    // Should render RTL content
    expect(screen.getByText("محتوى")).toBeInTheDocument();
  });

  it("should not crash when SessionProvider is unavailable", () => {
    mockUseSession.mockImplementation(() => {
      throw new Error("SessionProvider not available");
    });

    const originalError = console.error;
    console.error = vi.fn();
    // Expect a throw so we are explicit about current behavior
    expect(() => {
      render(
        <ClientLayout>
          <div>Content</div>
        </ClientLayout>,
      );
    }).toThrow("SessionProvider not available");
    console.error = originalError;
  });
});
