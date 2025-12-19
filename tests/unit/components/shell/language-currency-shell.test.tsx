import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";

// Make next/dynamic render the loaded component immediately
vi.mock("next/dynamic", () => ({
  __esModule: true,
  // For this test, return a stub currency selector regardless of loader
  default: () => (props: Record<string, unknown>) => (
    <div data-testid="currency-selector" {...props} />
  ),
}));

// Mock dynamic currency selector to avoid Next dynamic import
vi.mock("@/components/i18n/CurrencySelector", () => ({
  __esModule: true,
  default: () => <div data-testid="currency-selector" />,
}));

vi.mock("@/components/brand", () => ({
  BrandLogo: () => <div data-testid="brand-logo" />,
}));

vi.mock("@/contexts/TranslationContext", () => ({
  useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback || "" }),
}));

vi.mock("@/i18n/useI18n", () => ({
  useI18n: () => ({
    t: (_k: string, fallback?: string) => fallback || "",
    locale: "en",
    setLocale: vi.fn(),
  }),
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useThemeCtx: () => ({ theme: "light", setTheme: vi.fn() }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/superadmin/superadmin-session", () => ({
  useSuperadminSession: () => ({
    user: { username: "root", orgId: "org-1" },
  }),
}));

import { SuperadminHeader } from "@/components/superadmin/SuperadminHeader";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe("SuperadminHeader shell elements", () => {
  it("renders brand logo, language selector, and currency selector", () => {
    render(<SuperadminHeader />);

    expect(screen.getByTestId("brand-logo")).toBeInTheDocument();
    expect(screen.getByTestId("language-select")).toBeInTheDocument();
    expect(screen.getByTestId("currency-selector")).toBeInTheDocument();
  });
});
