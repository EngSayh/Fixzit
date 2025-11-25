import React from "react";
import { vi, describe, beforeEach, test, expect, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";

import VendorsPage from "@/app/fm/vendors/page";

const mockUseSession = vi.fn();
const mockUseFmOrgGuard = vi.fn();
const mockUseSWR = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("swr", () => ({
  __esModule: true,
  default: (...args: Parameters<typeof mockUseSWR>) => mockUseSWR(...args),
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

vi.mock("sonner", () => {
  const toastFn = vi.fn();
  toastFn.success = vi.fn();
  toastFn.error = vi.fn();
  toastFn.loading = vi.fn(() => "toast-id");
  return { toast: toastFn };
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSession.mockReturnValue({ data: { user: {} } });
  mockUseFmOrgGuard.mockReturnValue({
    hasOrgContext: true,
    orgId: "org-test",
    guard: null,
    supportBanner: null,
  });
  mockUseSWR.mockReturnValue({
    data: { items: [], pages: 1 },
    isLoading: false,
    mutate: vi.fn(),
    error: null,
  });
});

describe("VendorsPage org guard behavior", () => {
  test("renders guard when org context missing", () => {
    mockUseFmOrgGuard.mockReturnValue({
      hasOrgContext: false,
      orgId: null,
      guard: <div data-testid="org-guard" />,
      supportBanner: null,
    });

    render(<VendorsPage />);

    expect(screen.getByTestId("org-guard")).toBeInTheDocument();
    expect(screen.queryByTestId("module-tabs")).not.toBeInTheDocument();
  });

  test("renders vendor list when org context available", () => {
    mockUseFmOrgGuard.mockReturnValue({
      hasOrgContext: true,
      orgId: "org-456",
      guard: null,
      supportBanner: <div data-testid="support-banner" />,
    });
    mockUseSWR.mockReturnValue({
      data: { items: [], pages: 1 },
      isLoading: false,
      mutate: vi.fn(),
      error: null,
    });

    render(<VendorsPage />);

    expect(screen.getByTestId("module-tabs")).toHaveTextContent("vendors");
    expect(screen.getByTestId("support-banner")).toBeInTheDocument();
  });
});
beforeAll(() => {
  (globalThis as unknown as Record<string, unknown>).React = React;
});
