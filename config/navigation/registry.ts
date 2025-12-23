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
} from "@/components/ui/icons";
import type { Role } from "@/config/rbac.config";

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
  roles: Role[];
  children?: { label: string; route: string }[];
  quickActions: QuickAction[];
};

export const modules: ModuleDef[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    route: "/fm/dashboard",
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
    icon: LayoutDashboard,
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
      {
        id: "qa-admin-doa",
        label: "Update DOA",
        path: "/fm/administration",
      },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    route: "/fm/crm",
    icon: UserCheck,
    roles: [
      "SUPER_ADMIN",
      "ADMIN",
      "CORPORATE_OWNER",
      "TEAM_MEMBER",
      "PROPERTY_MANAGER",
      "TENANT",
    ],
    children: [
      { label: "Customer Directory", route: "/fm/crm?view=customers" },
      { label: "Leads & Opportunities", route: "/fm/crm?view=leads" },
      { label: "Contracts & Renewals", route: "/fm/crm?view=contracts" },
      { label: "Feedback & Complaints", route: "/fm/crm?view=feedback" },
    ],
    quickActions: [
      { id: "qa-crm-lead", label: "Add Lead", path: "/fm/crm?view=leads" },
      {
        id: "qa-crm-contract",
        label: "New Contract",
        path: "/fm/crm?view=contracts",
      },
      {
        id: "qa-crm-feedback",
        label: "Log Feedback",
        path: "/fm/crm?view=feedback",
      },
    ],
  },
  {
    id: "marketplace",
    label: "Marketplace",
    route: "/fm/marketplace",
    icon: ShoppingBag,
    roles: [
      "SUPER_ADMIN",
      "ADMIN",
      "CORPORATE_OWNER",
      "TEAM_MEMBER",
      "PROCUREMENT",
      "VENDOR",
    ],
    children: [
      { label: "Service Catalog", route: "/fm/marketplace" },
      { label: "Procurement", route: "/fm/marketplace" },
      { label: "Bidding / RFQs", route: "/fm/rfqs" },
    ],
    quickActions: [
      { id: "qa-mkt-rfq", label: "Create RFQ", path: "/fm/rfqs" },
      {
        id: "qa-mkt-po",
        label: "New Purchase Order",
        path: "/fm/orders",
      },
      {
        id: "qa-mkt-vendor",
        label: "Invite Vendor",
        path: "/fm/vendors",
      },
    ],
  },
  {
    id: "support",
    label: "Support & Helpdesk",
    route: "/fm/support",
    icon: Headphones,
    roles: [
      "SUPER_ADMIN",
      "ADMIN",
      "CORPORATE_OWNER",
      "TEAM_MEMBER",
      "TECHNICIAN",
      "PROPERTY_MANAGER",
      "TENANT",
      "VENDOR",
      "SUPPORT",
    ],
    children: [
      { label: "Tickets", route: "/fm/support/tickets" },
      { label: "Knowledge Base", route: "/fm/support" },
      { label: "Live Chat", route: "/fm/support" },
      { label: "SLA Monitoring", route: "/fm/support" },
    ],
    quickActions: [
      { id: "qa-support-ticket", label: "New Ticket", path: "/fm/support/tickets" },
      {
        id: "qa-support-article",
        label: "Create Article",
        path: "/fm/support",
      },
    ],
  },
  {
    id: "compliance",
    label: "Compliance & Legal",
    route: "/fm/compliance",
    icon: ShieldCheck,
    roles: [
      "SUPER_ADMIN",
      "ADMIN",
      "CORPORATE_OWNER",
      "TEAM_MEMBER",
      "PROPERTY_MANAGER",
      "TENANT",
      "AUDITOR",
    ],
    children: [
      { label: "Audit & Risk", route: "/fm/compliance/audits" },
      { label: "Policies", route: "/fm/compliance/policies" },
    ],
    quickActions: [
      {
        id: "qa-compliance-dispute",
        label: "Log Dispute",
        path: "/fm/compliance/audits",
      },
      {
        id: "qa-compliance-audit",
        label: "Start Audit",
        path: "/fm/compliance/audits",
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
      "PROPERTY_MANAGER",
      "FINANCE",
      "HR",
      "AUDITOR",
    ],
    quickActions: [
      {
        id: "qa-report-standard",
        label: "Standard Report",
        path: "/fm/reports?tab=standard",
      },
      {
        id: "qa-report-custom",
        label: "Custom Report",
        path: "/fm/reports?tab=custom",
      },
    ],
  },
  {
    id: "system",
    label: "System Management",
    route: "/fm/system",
    icon: Cog,
    roles: [
      "SUPER_ADMIN",
      "ADMIN",
      "CORPORATE_OWNER",
      "CORPORATE_ADMIN",
    ],
    children: [
      { label: "Users", route: "/fm/system" },
      { label: "Roles & Permissions", route: "/fm/system" },
      { label: "Billing", route: "/fm/system" },
      { label: "Integrations", route: "/fm/system/integrations" },
      { label: "System Settings", route: "/fm/system" },
    ],
    quickActions: [
      { id: "qa-system-user", label: "Invite User", path: "/fm/system" },
      {
        id: "qa-system-role",
        label: "New Role",
        path: "/fm/system",
      },
    ],
  },
];
