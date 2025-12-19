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
  properties: "components/aqar/PropertiesList.tsx",
  products: "components/marketplace/ProductsList.tsx",
  claims: "components/souq/claims/ClaimList.tsx",
  reviews: "components/seller/reviews/ReviewList.tsx",
  violations: "components/seller/health/ViolationsList.tsx",
} as const;

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

const dataTableLists: Array<keyof typeof listFiles> = [
  "workOrders",
  "users",
  "roles",
  "auditLogs",
  "employees",
  "invoices",
  "leaveRequests",
  "properties",
  "products",
];

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

  describe("Marketplace/Aqar Lists", () => {
    it("should render PropertiesList with DataTableStandard", () => {
      const source = readSource(listFiles.properties);
      expect(source).toContain("DataTableStandard");
    });

    it("should render ProductsList with DataTableStandard", () => {
      const source = readSource(listFiles.products);
      expect(source).toContain("DataTableStandard");
    });
  });

  describe("Souq/Seller Lists", () => {
    it("should render ClaimList with table structure", () => {
      const source = readSource(listFiles.claims);
      expect(source).toContain("TableHeader");
      expect(source).toContain("TableRow");
    });

    it("should render ReviewList with ReviewCard entries", () => {
      const source = readSource(listFiles.reviews);
      expect(source).toContain("ReviewCard");
    });

    it("should render ViolationsList as a mapped list", () => {
      const source = readSource(listFiles.violations);
      expect(source).toContain("violations.map");
    });
  });

  describe("Consistency Checks", () => {
    it("DataTableStandard lists include the shared table component", () => {
      const sources = dataTableLists.map((key) => readSource(listFiles[key]));
      const dataTableCount = sources.filter((src) =>
        src.includes("DataTableStandard")
      ).length;
      expect(dataTableCount).toBe(dataTableLists.length);
    });

    it("filter components are reused across lists", () => {
      const sources = dataTableLists.map((key) => readSource(listFiles[key]));
      const hasFilters = sources.some((src) =>
        ["TableFilterDrawer", "ActiveFiltersChips", "FacetMultiSelect"].some((token) =>
          src.includes(token)
        )
      );
      expect(hasFilters).toBe(true);
    });
  });
});
