import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, beforeEach, afterEach, vi, expect } from "vitest";
import { SWRConfig, mutate as globalMutate } from "swr";

import { WorkOrdersView } from "@/components/fm/WorkOrdersViewNew";
import { UsersList } from "@/components/administration/UsersList";
import { RolesList } from "@/components/administration/RolesList";
import { AuditLogsList } from "@/components/administration/AuditLogsList";
import { EmployeesList } from "@/components/hr/EmployeesList";
import { InvoicesList } from "@/components/finance/InvoicesList";
import { PropertiesList } from "@/components/aqar/PropertiesList";
import { ProductsList } from "@/components/marketplace/ProductsList";

// Mock navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/test",
}));

// Mock translation
vi.mock("@/contexts/TranslationContext", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback || "",
  }),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

describe("Filter schema + chips wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalMutate(() => true, undefined, { revalidate: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [], page: 1, limit: 20, total: 0 }),
      }) as unknown as typeof fetch,
    );
    // keep desktop mode for card-capable lists
    (global as any).innerWidth = 1024;
    vi.spyOn(window, "addEventListener").mockImplementation(() => {});
    vi.spyOn(window, "removeEventListener").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("WorkOrders quick chip sets overdue and shows chip", async () => {
    const user = userEvent.setup();
    render(<WorkOrdersView orgId="org-1" />, { wrapper: TestWrapper });

    await user.click(screen.getByText("Overdue"));

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const lastUrl = calls[calls.length - 1]?.[0] as string;
    expect(lastUrl).toContain("overdue=true");
    expect(screen.getAllByText(/Overdue/)[0]).toBeInTheDocument();
  });

  it("Users quick chip sets status and shows chip", async () => {
    const user = userEvent.setup();
    render(<UsersList orgId="org-1" />, { wrapper: TestWrapper });
    await user.click(screen.getByText("Active"));

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const lastUrl = calls[calls.length - 1]?.[0] as string;
    expect(lastUrl).toContain("status=ACTIVE");
    expect(screen.getByText(/Status: ACTIVE/)).toBeInTheDocument();
  });

  it("Roles quick chip sets type and shows chip", async () => {
    const user = userEvent.setup();
    render(<RolesList orgId="org-1" />, { wrapper: TestWrapper });
    await user.click(screen.getByText("System Roles"));

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const lastUrl = calls[calls.length - 1]?.[0] as string;
    expect(lastUrl).toContain("type=SYSTEM");
    expect(screen.getByText(/Type: SYSTEM/)).toBeInTheDocument();
  });

  it("Audit logs quick chip sets dateRange and shows chip", async () => {
    const user = userEvent.setup();
    render(<AuditLogsList orgId="org-1" />, { wrapper: TestWrapper });
    await user.click(screen.getByText("Today"));

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const lastUrl = calls[calls.length - 1]?.[0] as string;
    expect(lastUrl).toContain("dateRange=today");
    expect(screen.getByText(/Range: today/)).toBeInTheDocument();
  });

  it("Employees quick chip sets status and shows chip", async () => {
    const user = userEvent.setup();
    render(<EmployeesList orgId="org-1" />, { wrapper: TestWrapper });
    await user.click(screen.getByText("Active"));

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const lastUrl = calls[calls.length - 1]?.[0] as string;
    expect(lastUrl).toContain("status=ACTIVE");
    expect(screen.getByText(/Status: ACTIVE/)).toBeInTheDocument();
  });

  it("Invoices quick chip sets status and shows chip", async () => {
    const user = userEvent.setup();
    render(<InvoicesList orgId="org-1" />, { wrapper: TestWrapper });
    await user.click(screen.getByText("Unpaid"));

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const lastUrl = calls[calls.length - 1]?.[0] as string;
    expect(lastUrl).toContain("status=SENT");
    expect(screen.getByText(/Status: SENT/)).toBeInTheDocument();
  });

  it("Properties quick chip sets featured and shows chip", async () => {
    const user = userEvent.setup();
    render(<PropertiesList orgId="org-1" />, { wrapper: TestWrapper });
    await user.click(screen.getByText("Featured"));

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const lastUrl = calls[calls.length - 1]?.[0] as string;
    expect(lastUrl).toContain("featured=true");
    expect(screen.getAllByText(/Featured/)[0]).toBeInTheDocument();
  });

  it("Products quick chip sets category and shows chip", async () => {
    const user = userEvent.setup();
    render(<ProductsList orgId="org-1" />, { wrapper: TestWrapper });
    await user.click(screen.getByText("FM Supplies"));

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const lastUrl = calls[calls.length - 1]?.[0] as string;
    expect(lastUrl).toContain("category=FM+Supplies");
    expect(screen.getByText(/Category: FM Supplies/)).toBeInTheDocument();
  });
});
