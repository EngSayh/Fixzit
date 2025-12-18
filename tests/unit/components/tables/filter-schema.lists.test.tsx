import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, beforeEach, afterEach, vi, expect } from "vitest";
import { SWRConfig, mutate as globalMutate } from "swr";

import {
  WorkOrdersView,
  WORK_ORDER_FILTER_SCHEMA,
  type WorkOrderFilters,
} from "@/components/fm/WorkOrdersViewNew";
import {
  UsersList,
  USER_FILTER_SCHEMA,
  type UserFilters,
} from "@/components/administration/UsersList";
import {
  RolesList,
  ROLE_FILTER_SCHEMA,
  type RoleFilters,
} from "@/components/administration/RolesList";
import {
  AuditLogsList,
  AUDIT_FILTER_SCHEMA,
  type AuditFilters,
} from "@/components/administration/AuditLogsList";
import {
  EmployeesList,
  EMPLOYEE_FILTER_SCHEMA,
  type EmployeeFilters,
} from "@/components/hr/EmployeesList";
import {
  InvoicesList,
  INVOICE_FILTER_SCHEMA,
  type InvoiceFilters,
} from "@/components/finance/InvoicesList";
import {
  PropertiesList,
  PROPERTY_FILTER_SCHEMA,
  type PropertyFilters,
} from "@/components/aqar/PropertiesList";
import {
  ProductsList,
  PRODUCT_FILTER_SCHEMA,
  type ProductFilters,
} from "@/components/marketplace/ProductsList";
import {
  buildActiveFilterChips,
  serializeFilters,
  type FilterSchema,
} from "@/components/tables/utils/filterSchema";

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

type SchemaCase<TFilters extends Record<string, unknown>> = {
  name: string;
  schema: Array<FilterSchema<TFilters>>;
  filters: TFilters;
  expectedParams: Record<string, string | number | boolean>;
  expectedLabels: string[];
};

const schemaCases: Array<SchemaCase<Record<string, unknown>>> = [
  {
    name: "WorkOrders",
    schema: WORK_ORDER_FILTER_SCHEMA as Array<FilterSchema<Record<string, unknown>>>,
    filters: {
      status: "IN_PROGRESS",
      dueDateFrom: "2024-01-01",
      dueDateTo: "2024-01-31",
    } satisfies WorkOrderFilters,
    expectedParams: {
      status: "IN_PROGRESS",
      dueDateFrom: "2024-01-01",
      dueDateTo: "2024-01-31",
    },
    expectedLabels: ["Status: IN_PROGRESS", "Due: 2024-01-01 → 2024-01-31"],
  },
  {
    name: "Users",
    schema: USER_FILTER_SCHEMA as Array<FilterSchema<Record<string, unknown>>>,
    filters: {
      status: "ACTIVE",
      role: "ORG_ADMIN",
      lastLoginFrom: "2024-01-01",
      lastLoginTo: "2024-01-10",
    } satisfies UserFilters,
    expectedParams: {
      status: "ACTIVE",
      role: "ORG_ADMIN",
      lastLoginFrom: "2024-01-01",
      lastLoginTo: "2024-01-10",
    },
    expectedLabels: [
      "Status: ACTIVE",
      "Role: ORG_ADMIN",
      "Last login: 2024-01-01 \u2192 2024-01-10",
    ],
  },
  {
    name: "Roles",
    schema: ROLE_FILTER_SCHEMA as Array<FilterSchema<Record<string, unknown>>>,
    filters: {
      type: "SYSTEM",
      status: "ACTIVE",
      membersMin: 2,
      membersMax: 5,
    } satisfies RoleFilters,
    expectedParams: {
      type: "SYSTEM",
      status: "ACTIVE",
      membersMin: 2,
      membersMax: 5,
    },
    expectedLabels: ["Type: SYSTEM", "Status: ACTIVE", "Members: 2-5"],
  },
  {
    name: "AuditLogs",
    schema: AUDIT_FILTER_SCHEMA as Array<FilterSchema<Record<string, unknown>>>,
    filters: {
      eventType: "LOGIN",
      status: "SUCCESS",
      action: "admin",
      timestampFrom: "2024-02-01",
      timestampTo: "2024-02-02",
    } satisfies AuditFilters,
    expectedParams: {
      eventType: "LOGIN",
      status: "SUCCESS",
      action: "admin",
      timestampFrom: "2024-02-01",
      timestampTo: "2024-02-02",
    },
    expectedLabels: [
      "Event: LOGIN",
      "Status: SUCCESS",
      "Action: admin",
      "Timestamp: 2024-02-01 \u2192 2024-02-02",
    ],
  },
  {
    name: "Employees",
    schema: EMPLOYEE_FILTER_SCHEMA as Array<FilterSchema<Record<string, unknown>>>,
    filters: {
      status: "ON_LEAVE",
      department: "Operations",
      employmentType: "FULL_TIME",
      joiningFrom: "2024-01-01",
      joiningTo: "2024-01-31",
    } satisfies EmployeeFilters,
    expectedParams: {
      status: "ON_LEAVE",
      department: "Operations",
      employmentType: "FULL_TIME",
      joiningFrom: "2024-01-01",
      joiningTo: "2024-01-31",
    },
    expectedLabels: [
      "Status: ON LEAVE",
      "Department: Operations",
      "Type: FULL TIME",
      "Joining: 2024-01-01 \u2192 2024-01-31",
    ],
  },
  {
    name: "Invoices",
    schema: INVOICE_FILTER_SCHEMA as Array<FilterSchema<Record<string, unknown>>>,
    filters: {
      status: "PAID",
      amountMin: 1000,
      amountMax: 5000,
      issueFrom: "2024-01-01",
      issueTo: "2024-01-15",
    } satisfies InvoiceFilters,
    expectedParams: {
      status: "PAID",
      amountMin: 1000,
      amountMax: 5000,
      issueFrom: "2024-01-01",
      issueTo: "2024-01-15",
    },
    expectedLabels: [
      "Status: PAID",
      "Amount: 1000-5000",
      "Issue: 2024-01-01 \u2192 2024-01-15",
    ],
  },
  {
    name: "Properties",
    schema: PROPERTY_FILTER_SCHEMA as Array<FilterSchema<Record<string, unknown>>>,
    filters: {
      listingType: "RENT",
      city: "Riyadh",
      priceMin: 5000,
      priceMax: 9000,
    } satisfies PropertyFilters,
    expectedParams: {
      listingType: "RENT",
      city: "Riyadh",
      priceMin: 5000,
      priceMax: 9000,
    },
    expectedLabels: ["Listing: RENT", "City: Riyadh", "Price: 5000-9000"],
  },
  {
    name: "Products",
    schema: PRODUCT_FILTER_SCHEMA as Array<FilterSchema<Record<string, unknown>>>,
    filters: {
      category: "FM Supplies",
      sellerType: "FIXZIT",
      ratingMin: 4.5,
    } satisfies ProductFilters,
    expectedParams: {
      category: "FM Supplies",
      sellerType: "FIXZIT",
      ratingMin: 4.5,
    },
    expectedLabels: ["Category: FM Supplies", "Seller: FIXZIT", "Rating ≥ 4.5"],
  },
];

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
    expect(screen.getByRole("button", { name: "Overdue" })).toHaveAttribute("aria-pressed", "true");
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

describe("Filter schema serialization (drawer apply)", () => {
  schemaCases.forEach(({ name, schema, filters, expectedParams, expectedLabels }) => {
    it(`${name} serializes filters and builds chips`, () => {
      const params = new URLSearchParams();
      serializeFilters(filters, schema, params);

      Object.entries(expectedParams).forEach(([key, value]) => {
        expect(params.get(key)).toBe(String(value));
      });

      const chips = buildActiveFilterChips(filters, schema, () => {});
      const labels = chips.map((chip) => chip.label);
      expectedLabels.forEach((label) => {
        expect(labels).toContain(label);
      });
    });
  });
});
