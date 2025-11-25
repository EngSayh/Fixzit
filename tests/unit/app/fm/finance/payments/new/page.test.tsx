import React from "react";
import { describe, beforeEach, test, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";

import NewPaymentPage from "@/app/fm/finance/payments/new/page";

const mockUseFmOrgGuard = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/contexts/FormStateContext", () => ({
  useFormState: () => ({
    registerForm: vi.fn(),
    unregisterForm: vi.fn(),
  }),
}));

vi.mock("@/contexts/TranslationContext", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock("@/components/fm/useFmOrgGuard", () => ({
  useFmOrgGuard: () => mockUseFmOrgGuard(),
}));

vi.mock("@/components/fm/ModuleViewTabs", () => ({
  __esModule: true,
  default: ({ moduleId }: { moduleId: string }) => (
    <div data-testid="module-tabs">{moduleId}</div>
  ),
}));

vi.mock("@/components/ClientDate", () => ({
  __esModule: true,
  default: ({ date }: { date: string }) => (
    <span data-testid="client-date">{date}</span>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("NewPaymentPage org guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFmOrgGuard.mockReturnValue({
      hasOrgContext: true,
      orgId: "org-test",
      guard: null,
      supportBanner: <div data-testid="support-banner">banner</div>,
    });
  });

  test("renders guard content when organization is missing", async () => {
    mockUseFmOrgGuard.mockReturnValue({
      hasOrgContext: false,
      orgId: null,
      guard: <div data-testid="org-guard" />,
      supportBanner: null,
    });

    await act(async () => {
      render(<NewPaymentPage />);
    });

    expect(screen.getByTestId("module-tabs")).toHaveTextContent("finance");
    expect(screen.getByTestId("org-guard")).toBeInTheDocument();
  });

  test("renders payment form when organization context is available", async () => {
    await act(async () => {
      render(<NewPaymentPage />);
    });

    expect(screen.getByTestId("module-tabs")).toHaveTextContent("finance");
    expect(screen.getByTestId("support-banner")).toBeInTheDocument();
    expect(screen.getByText(/New Payment/i)).toBeInTheDocument();
  });
});
