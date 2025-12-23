import React from "react";
import { vi, describe, beforeEach, test, expect, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";

import VendorsPage from "@/app/(fm)/fm/vendors/page";

const mockFmGuardedPage = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: {} } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("swr", () => ({
  __esModule: true,
  default: () => ({
    data: { items: [], pages: 1 },
    isLoading: false,
    mutate: vi.fn(),
    error: null,
  }),
}));

vi.mock("@/components/fm/FmGuardedPage", () => ({
  FmGuardedPage: (props: { moduleId: string; children: (ctx: unknown) => React.ReactNode }) => mockFmGuardedPage(props),
}));

vi.mock("@/components/fm/ModuleViewTabs", () => ({
  __esModule: true,
  default: ({ moduleId }: { moduleId: string }) => (
    <div data-testid="module-tabs">{moduleId}</div>
  ),
}));

vi.mock("@/components/fm/vendors", () => ({
  FmVendorsList: ({ orgId, supportBanner }: { orgId: string; supportBanner?: React.ReactNode }) => (
    <div data-testid="vendor-list">
      Vendors for {orgId}
      {supportBanner}
    </div>
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
});

describe("VendorsPage org guard behavior", () => {
  test("renders guard when org context missing", () => {
    mockFmGuardedPage.mockImplementation(() => (
      <div data-testid="org-guard" />
    ));

    render(<VendorsPage />);

    expect(screen.getByTestId("org-guard")).toBeInTheDocument();
    expect(screen.queryByTestId("module-tabs")).not.toBeInTheDocument();
  });

  test("renders vendor list when org context available", () => {
    mockFmGuardedPage.mockImplementation(({ children }: { children: (ctx: unknown) => React.ReactNode }) => (
      <>
        {children({
          orgId: "org-456",
          supportBanner: <div data-testid="support-banner" />,
          hasOrgContext: true,
          guard: null,
        })}
      </>
    ));

    render(<VendorsPage />);

    expect(screen.getByTestId("module-tabs")).toHaveTextContent("vendors");
    expect(screen.getByTestId("support-banner")).toBeInTheDocument();
  });
});
beforeAll(() => {
  (globalThis as unknown as Record<string, unknown>).React = React;
});
