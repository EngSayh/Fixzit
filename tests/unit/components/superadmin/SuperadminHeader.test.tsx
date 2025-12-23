import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { mockFetch, restoreFetch } from "@/tests/helpers/domMocks";
import { useRouter } from "next/navigation";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/i18n/useI18n", () => ({
  useI18n: () => ({
    t: (_k: string, fallback?: string) => fallback || _k,
    locale: "en",
    setLocale: vi.fn(),
  }),
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useThemeCtx: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

vi.mock("@/components/brand", () => ({
  BrandLogo: () => <div data-testid="brand-logo">logo</div>,
}));

vi.mock("@/components/i18n/CurrencySelector", () => ({
  __esModule: true,
  default: ({ variant }: { variant: string }) => (
    <div data-testid="currency-selector">{variant}</div>
  ),
}));

vi.mock("@/lib/security/validate-public-https-url", () => ({}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: React.forwardRef((props: any, ref: any) => <input ref={ref} {...props} />),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
    ...props
  }: any) => (
    <select
      data-testid="language-select"
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      {...props}
    >
      {children}
    </select>
  ),
  SelectItem: ({ children, value }: any) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock("@/config/language-options", () => ({
  LANGUAGE_OPTIONS: [
    { language: "en", native: "English", flag: "🇺🇸", comingSoon: false },
    { language: "ar", native: "العربية", flag: "🇸🇦", comingSoon: false },
  ],
}));

vi.mock("./superadmin-session", () => ({
  useSuperadminSession: () => ({
    user: { username: "root" },
  }),
}));

import { SuperadminHeader } from "@/components/superadmin/SuperadminHeader";

describe("SuperadminHeader", () => {
  const push = vi.fn();
  let fetchMock: ReturnType<typeof mockFetch>;

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__fixzitRouterPush = push;
    vi.mocked(useRouter as unknown as () => any).mockReturnValue({ push });
    fetchMock = mockFetch();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) } as Response);
  });

  afterEach(() => {
    restoreFetch();
  });

  it("routes logo to landing page", () => {
    render(<SuperadminHeader />);
    const logoButton = screen.getByLabelText(/Go to landing/i);
    fireEvent.click(logoButton);
    expect(push).toHaveBeenCalledWith("/");
  });

  it("keeps tenant navigation available via switch control", () => {
    render(<SuperadminHeader />);
    const switchButton = screen.getByText(/Switch tenant/i);
    fireEvent.click(switchButton);
    expect(push).toHaveBeenCalledWith("/superadmin/tenants");
  });

  it("submits search on Enter and routes to superadmin search", () => {
    render(<SuperadminHeader />);
    const searchInput = screen.getByLabelText(/search superadmin/i);
    fireEvent.change(searchInput, { target: { value: "billing" } });
    fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });
    expect(push).toHaveBeenCalledWith("/superadmin/search?q=billing");
  });

  it("focuses search input on Cmd/Ctrl+K", () => {
    render(<SuperadminHeader />);
    const searchInput = screen.getByLabelText(/search superadmin/i);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(searchInput).toHaveFocus();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(searchInput).toHaveFocus();
  });

  it("renders a single language dropdown with flags", () => {
    render(<SuperadminHeader />);
    const select = screen.getByTestId("superadmin-language-dropdown");
    expect(select).toBeInTheDocument();
    expect(select.querySelectorAll("option").length).toBeGreaterThanOrEqual(2);
  });

  it("renders currency selector", () => {
    render(<SuperadminHeader />);
    expect(screen.getByTestId("currency-selector")).toBeInTheDocument();
  });
});
