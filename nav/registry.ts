// src/nav/registry.ts
// [CODE REVIEW FIX]: Changed Role type to UPPER_SNAKE_CASE to match RBAC middleware (withAuthRbac.ts)
// and database schema. All route and path strings now include /fm/ prefix to match application structure.
import React from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  DollarSign,
  Users,
  Settings,
  UserCheck,
  ShoppingBag,
  Headphones,
  ShieldCheck,
  BarChart3,
  Cog,
} from "lucide-react";
import type { Role } from "@/config/rbac.config";

// Nav gating uses the canonical STRICT v4.1 Role from config/rbac.config.
// To add/remove roles, update UserRole in types/user.ts / rbac.config, not here.
export type { Role };

export type QuickAction = {
  id: string;
  label: string;
  path: string;
  roles?: Role[];
};

export type ModuleDef = {
  id: string;
  label: string;
  route: string;
  icon: React.ComponentType<Record<string, unknown>>;
  roles: Role[]; // who can see the module
  children?: { label: string; route: string }[];
  quickActions: QuickAction[];
};

export const modules: ModuleDef[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    route: "/fm/dashboard",
    icon: LayoutDashboard,
    // SECURITY FIX: Removed GUEST role - guests should not have dashboard access (principle of least privilege)
    roles: [
      "SUPER_ADMIN",
      "ADMIN",
      "CORPORATE_OWNER",
      "TEAM_MEMBER",
      "TECHNICIAN",
      "PROPERTY_MANAGER",
      "TENANT",
      "VENDOR",
    ],
    quickActions: [
      { id: "qa-new-wo", label: "New Work Order", path: "/fm/work-orders/new" },
      {
        id: "qa-new-invoice",
        label: "New Invoice",
        path: "/fm/finance/invoices/new",
      },
      {
        id: "qa-add-property",
        label: "Add Property",
        path: "/fm/properties/new",
      },
    ],
  },
  {
    id: "work-orders",
    label: "Work Orders",
    route: "/fm/work-orders",
    icon: ClipboardList,
    roles: [
      "SUPER_ADMIN",
      "ADMIN",
      "CORPORATE_OWNER",
      "TEAM_MEMBER",
      "TECHNICIAN",
      "PROPERTY_MANAGER",
      "TENANT",
      "VENDOR",
    ],
    children: [
      { label: "Create", route: "/fm/work-orders/new" },
      { label: "Track & Assign", route: "/fm/work-orders/board" },
      { label: "Preventive", route: "/fm/work-orders/pm" },
      { label: "Service History", route: "/fm/work-orders/history" },
    ],
    quickActions: [
      { id: "qa-wo-new", label: "New Work Order", path: "/fm/work-orders/new" },
      { id: "qa-wo-assign", label: "Assign", path: "/fm/work-orders/board" },
      {
        id: "qa-wo-approval",
        label: "Request Approval",
        path: "/fm/work-orders/approvals",
      },
    ],
  },
  {
    id: "properties",
    label: "Properties",
    route: "/fm/properties",
    icon: Building2,
    roles: ["SUPER_ADMIN", "ADMIN", "CORPORATE_OWNER", "PROPERTY_MANAGER", "TENANT"],
    children: [
      { label: "Property List", route: "/fm/properties" },
      { label: "Units & Tenants", route: "/fm/properties/units" },
      { label: "Lease Management", route: "/fm/properties/leases" },
      { label: "Inspections", route: "/fm/properties/inspections" },
      { label: "Documents", route: "/fm/properties/documents" },
    ],
    quickActions: [
      { id: "qa-prop-new", label: "Add Property", path: "/fm/properties/new" },
      {
        id: "qa-unit-new",
        label: "Add Unit",
        path: "/fm/properties/units/new",
      },
      {
        id: "qa-inspection",
        label: "Create Inspection",
        path: "/fm/properties/inspections/new",
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    route: "/fm/finance",
    icon: DollarSign,
    // STRICT v4.1: Finance roles and officers; visibility for admin and corporate owner/admin
    roles: ["SUPER_ADMIN", "ADMIN", "CORPORATE_OWNER", "CORPORATE_ADMIN", "FINANCE", "FINANCE_OFFICER"],
    children: [
      { label: "Invoices", route: "/fm/finance/invoices" },
      { label: "Payments", route: "/fm/finance/payments" },
      { label: "Expenses", route: "/fm/finance/expenses" },
      { label: "Budgets", route: "/fm/finance/budgets" },
      { label: "Reports", route: "/fm/finance/reports" },
    ],
    quickActions: [
      {
        id: "qa-inv-new",
        label: "New Invoice",
        path: "/fm/finance/invoices/new",
      },
      {
        id: "qa-pay-new",
        label: "Record Payment",
        path: "/fm/finance/payments/new",
      },
      {
        id: "qa-exp-new",
        label: "New Expense",
        path: "/fm/finance/expenses/new",
      },
      {
        id: "qa-bud-new",
        label: "New Budget",
        path: "/fm/finance/budgets/new",
      },
    ],
  },
  {
    id: "hr",
    label: "Human Resources",
    route: "/fm/hr",
    icon: Users,
    // STRICT v4.1: HR, HR_OFFICER have module access
    roles: ["SUPER_ADMIN", "ADMIN", "CORPORATE_OWNER", "CORPORATE_ADMIN", "HR", "HR_OFFICER"],
    children: [
      { label: "Directory", route: "/fm/hr/directory" },
      { label: "Attendance & Leave", route: "/fm/hr/leave" },
      { label: "Payroll", route: "/fm/hr/payroll" },
      { label: "Recruitment", route: "/fm/hr/recruitment" },
    ],
    quickActions: [
      { id: "qa-hr-emp", label: "Add Employee", path: "/fm/hr/directory/new" },
      {
        id: "qa-hr-leave",
        label: "Approve Leave",
        path: "/fm/hr/leave/approvals",
      },
      { id: "qa-hr-payroll", label: "Run Payroll", path: "/fm/hr/payroll/run" },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    route: "/fm/administration",
    icon: Settings,
    roles: ["SUPER_ADMIN", "ADMIN", "CORPORATE_OWNER"],
    quickActions: [
      {
        id: "qa-admin-policy",
        label: "Add Policy",
        path: "/fm/administration/policies/new",
      },
      {
        id: "qa-admin-asset",
        label: "Add Asset",
        path: "/fm/administration/assets/new",
      },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    route: "/fm/crm",
    icon: UserCheck,
    roles: ["SUPER_ADMIN", "ADMIN", "CORPORATE_OWNER", "TEAM_MEMBER"],
    quickActions: [
      { id: "qa-crm-lead", label: "Add Lead", path: "/fm/crm/leads/new" },
      {
        id: "qa-crm-account",
        label: "Add Account",
        path: "/fm/crm/accounts/new",
      },
    ],
  },
  {
    id: "marketplace",
    label: "Marketplace",
    route: "/fm/marketplace",
    icon: ShoppingBag,
    roles: ["SUPER_ADMIN", "ADMIN", "CORPORATE_OWNER", "TENANT", "VENDOR"],
    quickActions: [
      {
        id: "qa-mkt-vendor",
        label: "Add Vendor",
        path: "/fm/marketplace/vendors/new",
      },
      {
        id: "qa-mkt-listing",
        label: "New Listing",
        path: "/fm/marketplace/listings/new",
      },
      {
        id: "qa-mkt-po",
        label: "Raise PO/RFQ",
        path: "/fm/marketplace/orders/new",
      },
    ],
  },
  {
    id: "support",
    label: "Support & Helpdesk",
    route: "/fm/support",
    icon: Headphones,
    // STRICT v4.1: SUPPORT_AGENT has dedicated access
    roles: [
      "SUPER_ADMIN",
      "ADMIN",
      "CORPORATE_OWNER",
      "CORPORATE_ADMIN",
      "TEAM_MEMBER",
      "TECHNICIAN",
      "PROPERTY_MANAGER",
      "FM_MANAGER",
      "SUPPORT_AGENT",
      "OPERATIONS_MANAGER",
      "TENANT",
      "VENDOR",
    ],
    quickActions: [
      {
        id: "qa-sup-ticket",
        label: "New Ticket",
        path: "/fm/support/tickets/new",
      },
      {
        id: "qa-sup-escalate",
        label: "Escalate",
        path: "/fm/support/escalations/new",
      },
    ],
  },
  {
    id: "compliance",
    label: "Compliance & Legal",
    route: "/fm/compliance",
    icon: ShieldCheck,
    roles: ["SUPER_ADMIN", "ADMIN", "CORPORATE_OWNER"],
    quickActions: [
      {
        id: "qa-legal-contract",
        label: "Upload Contract",
        path: "/fm/compliance/contracts/new",
      },
      {
        id: "qa-legal-audit",
        label: "Start Audit",
        path: "/fm/compliance/audits/new",
      },
    ],
  },
  {
    id: "reports",
    label: "Reports & Analytics",
    route: "/fm/reports",
    icon: BarChart3,
    roles: [
      "SUPER_ADMIN",
      "ADMIN",
      "CORPORATE_OWNER",
      "TEAM_MEMBER",
      "TECHNICIAN",
      "PROPERTY_MANAGER",
      "TENANT",
      "VENDOR",
    ],
    quickActions: [
      { id: "qa-rpt-gen", label: "Generate Report", path: "/fm/reports/new" },
      {
        id: "qa-rpt-sched",
        label: "Schedule",
        path: "/fm/reports/schedules/new",
      },
    ],
  },
  {
    id: "system",
    label: "System Management",
    route: "/fm/system",
    icon: Cog,
    roles: ["SUPER_ADMIN", "ADMIN", "CORPORATE_OWNER"],
    quickActions: [
      {
        id: "qa-sys-invite",
        label: "Invite User",
        path: "/fm/system/users/invite",
      },
      { id: "qa-sys-role", label: "Create Role", path: "/fm/system/roles/new" },
      {
        id: "qa-sys-int",
        label: "Configure Integration",
        path: "/fm/system/integrations",
      },
    ],
  },
];
