import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TopBar from "@/components/TopBar";
import PublicProviders from "@/providers/PublicProviders";

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(), // deprecated but used in some libs
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

vi.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    }),
    usePathname: () => "/",
  };
});

vi.mock("next-auth/react", async () => {
  const actual =
    await vi.importActual<typeof import("next-auth/react")>("next-auth/react");
  return {
    ...actual,
    useSession: () => ({ data: null, status: "unauthenticated" }),
    SessionProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

vi.mock("@/components/topbar/GlobalSearch", () => ({
  __esModule: true,
  default: () => <div data-testid="global-search-stub" />,
}));

describe("TopBar (marketing/public view)", () => {
  it("shows language toggle and hides app/module pills and app switcher", async () => {
    const { container } = render(
      <PublicProviders initialLocale="ar">
        <TopBar />
      </PublicProviders>,
    );

    // Wait until providers settle and topbar renders
    const banner = await screen.findByRole("banner");
    expect(banner).toBeInTheDocument();

    // Language selector should be visible for guests
    const languageSelector = await screen.findByTestId("language-selector");
    expect(languageSelector).toBeInTheDocument();

    // App/module pills should NOT render on marketing routes
    expect(screen.queryByText("إدارة المنشآت (FM)")).toBeNull();
    expect(screen.queryByText("لوحة التحكم")).toBeNull();

    // Heavy app switcher / mega menu should be hidden on marketing routes
    expect(screen.queryByRole("button", { name: /تبديل التطبيق/i })).toBeNull();
    expect(screen.queryByText(/الوحدات/i)).toBeNull();
  });
});
