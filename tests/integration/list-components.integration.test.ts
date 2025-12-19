/**
 * Integration Test: All List Components (Static Source Checks)
 * Validates key consistency markers across list components without rendering.
 */
import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

const listFiles = {
  workOrders: "components/fm/WorkOrdersViewNew.tsx",
  users: "components/administration/UsersList.tsx",
  roles: "components/administration/RolesList.tsx",
  auditLogs: "components/administration/AuditLogsList.tsx",
  employees: "components/hr/EmployeesList.tsx",
  invoices: "components/finance/InvoicesList.tsx",
  leaveRequests: "components/hr/LeaveRequestsList.tsx",
} as const;

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("List Components Integration", () => {
  describe("Work Orders List", () => {
    it("should use DataTableStandard", () => {
      const source = readSource(listFiles.workOrders);
      expect(source).toContain("DataTableStandard");
    });

    it("should sync filters to URL", () => {
      const source = readSource(listFiles.workOrders);
      expect(source).toContain("useTableQueryState");
    });

    it("should provide CardList for mobile", () => {
      const source = readSource(listFiles.workOrders);
      expect(source).toContain("CardList");
    });
  });

  describe("Administration Lists", () => {
    it("should render UsersList with DataTableStandard", () => {
      const source = readSource(listFiles.users);
      expect(source).toContain("DataTableStandard");
    });

    it("should render RolesList with DataTableStandard", () => {
      const source = readSource(listFiles.roles);
      expect(source).toContain("DataTableStandard");
    });

    it("should render AuditLogsList with DataTableStandard", () => {
      const source = readSource(listFiles.auditLogs);
      expect(source).toContain("DataTableStandard");
    });
  });

  describe("HR/Finance Lists", () => {
    it("should render EmployeesList with DataTableStandard", () => {
      const source = readSource(listFiles.employees);
      expect(source).toContain("DataTableStandard");
    });

    it("should render InvoicesList with DataTableStandard", () => {
      const source = readSource(listFiles.invoices);
      expect(source).toContain("DataTableStandard");
    });

    it("should render LeaveRequestsList with DataTableStandard", () => {
      const source = readSource(listFiles.leaveRequests);
      expect(source).toContain("DataTableStandard");
    });
  });

  describe("Consistency Checks", () => {
    it("all lists reference DataTableStandard", () => {
      const sources = Object.values(listFiles).map((file) => readSource(file));
      const dataTableCount = sources.filter((src) =>
        src.includes("DataTableStandard")
      ).length;
      expect(dataTableCount).toBe(Object.keys(listFiles).length);
    });

    it("filter components are reused across lists", () => {
      const sources = Object.values(listFiles).map((file) => readSource(file));
      const hasFilters = sources.some((src) =>
        ["TableFilterDrawer", "ActiveFiltersChips", "FacetMultiSelect"].some((token) =>
          src.includes(token)
        )
      );
      expect(hasFilters).toBe(true);
    });
  });
});
