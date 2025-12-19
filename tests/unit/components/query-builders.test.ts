import { describe, it, expect } from "vitest";
import { buildWorkOrdersQuery } from "@/components/fm/WorkOrdersViewNew";
import { buildUsersQuery } from "@/components/administration/UsersList";
import { buildEmployeesQuery } from "@/components/hr/EmployeesList";
import { buildInvoicesQuery } from "@/components/finance/InvoicesList";
import { buildAuditLogsQuery } from "@/components/administration/AuditLogsList";

const baseState = {
  page: 1,
  pageSize: 20,
  q: "",
  filters: {},
};

describe("query builders apply filters", () => {
  it("work orders includes overdue, assignment, sla, due dates", () => {
    const query = buildWorkOrdersQuery(
      {
        ...baseState,
        filters: {
          status: "SUBMITTED",
          priority: "HIGH",
          overdue: true,
          assignedToMe: true,
          unassigned: true,
          slaRisk: true,
          dueDateFrom: "2024-01-01",
          dueDateTo: "2024-01-31",
        },
      },
      "org-1",
    );
    expect(query).toContain("status=SUBMITTED");
    expect(query).toContain("priority=HIGH");
    expect(query).toContain("overdue=true");
    expect(query).toContain("assignedToMe=true");
    expect(query).toContain("unassigned=true");
    expect(query).toContain("slaRisk=true");
    expect(query).toContain("dueDateFrom=2024-01-01");
    expect(query).toContain("dueDateTo=2024-01-31");
  });

  it("users includes inactivity and lastLogin range", () => {
    const query = buildUsersQuery(
      {
        ...baseState,
        filters: {
          role: "ORG_ADMIN",
          status: "ACTIVE",
          department: "Engineering",
          inactiveDays: 30,
          lastLoginFrom: "2024-01-01",
          lastLoginTo: "2024-02-01",
        },
      },
      "org-1",
    );
    expect(query).toContain("role=ORG_ADMIN");
    expect(query).toContain("status=ACTIVE");
    expect(query).toContain("department=Engineering");
    expect(query).toContain("inactiveDays=30");
    expect(query).toContain("lastLoginFrom=2024-01-01");
    expect(query).toContain("lastLoginTo=2024-02-01");
  });

  it("employees includes joining/review filters", () => {
    const query = buildEmployeesQuery(
      {
        ...baseState,
        filters: {
          status: "ACTIVE",
          department: "HR",
          employmentType: "FULL_TIME",
          joiningDateDays: 30,
          reviewDueDays: 7,
          joiningFrom: "2024-01-01",
          joiningTo: "2024-01-31",
        },
      },
      "org-1",
    );
    expect(query).toContain("status=ACTIVE");
    expect(query).toContain("department=HR");
    expect(query).toContain("employmentType=FULL_TIME");
    expect(query).toContain("joiningDateDays=30");
    expect(query).toContain("reviewDueDays=7");
    expect(query).toContain("joiningFrom=2024-01-01");
    expect(query).toContain("joiningTo=2024-01-31");
  });

  it("invoices includes amount and date ranges", () => {
    const query = buildInvoicesQuery(
      {
        ...baseState,
        filters: {
          status: "PAID",
          amountMin: 10,
          amountMax: 1000,
          dateRange: "month",
          issueFrom: "2024-01-01",
          issueTo: "2024-01-31",
          dueFrom: "2024-02-01",
          dueTo: "2024-02-15",
        },
      },
      "org-1",
    );
    expect(query).toContain("status=PAID");
    expect(query).toContain("amountMin=10");
    expect(query).toContain("amountMax=1000");
    expect(query).toContain("dateRange=month");
    expect(query).toContain("issueFrom=2024-01-01");
    expect(query).toContain("issueTo=2024-01-31");
    expect(query).toContain("dueFrom=2024-02-01");
    expect(query).toContain("dueTo=2024-02-15");
  });

  it("audit logs includes event/action/time filters", () => {
    const query = buildAuditLogsQuery(
      {
        ...baseState,
        pageSize: 50,
        filters: {
          eventType: "LOGIN",
          status: "FAILURE",
          userId: "u1",
          ipAddress: "10.0.0.1",
          dateRange: "7d",
          action: "admin",
          timestampFrom: "2024-01-01",
          timestampTo: "2024-01-02",
        },
      },
      "org-1",
    );
    expect(query).toContain("eventType=LOGIN");
    expect(query).toContain("status=FAILURE");
    expect(query).toContain("userId=u1");
    expect(query).toContain("ipAddress=10.0.0.1");
    expect(query).toContain("dateRange=7d");
    expect(query).toContain("action=admin");
    expect(query).toContain("timestampFrom=2024-01-01");
    expect(query).toContain("timestampTo=2024-01-02");
  });
});
