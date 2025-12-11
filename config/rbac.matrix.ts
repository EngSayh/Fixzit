import { UserRole, UserRoleType } from "@/types/user";

export interface RBACModule {
  id: string;
  label: string;
  description: string;
}

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export const RBAC_MODULES: RBACModule[] = [
  { id: "dashboard", label: "Dashboard", description: "Org overview and insights" },
  { id: "properties", label: "Properties", description: "Property and portfolio management" },
  { id: "units", label: "Units", description: "Unit management within properties" },
  { id: "tenants", label: "Tenants", description: "Tenant management and profiles" },
  { id: "vendors", label: "Vendors", description: "Vendor and contractor management" },
  { id: "work_orders", label: "Work Orders", description: "Maintenance and service requests" },
  { id: "approvals", label: "Approvals", description: "Approval workflows and SLA decisions" },
  { id: "assets_sla", label: "Assets & SLA", description: "Assets, PM schedules, SLA tracking" },
  { id: "finance", label: "Finance", description: "Invoices, payments, ZATCA compliance, budgets" },
  { id: "marketplace", label: "Marketplace (Souq)", description: "Listings, orders, claims/returns, settlements" },
  { id: "crm_notifications", label: "CRM & Notifications", description: "Customers, communication, templates, alerts" },
  { id: "hr", label: "HR", description: "Human resources management" },
  { id: "reports", label: "Reports", description: "Analytics and reporting" },
  { id: "admin", label: "Admin", description: "Administrative functions and configuration" },
  { id: "qa", label: "QA & Telemetry", description: "QA alerts/logs and platform telemetry" },
];

type RolePermissionsMap = Record<UserRoleType, Partial<Record<string, ModulePermissions>>>;

// 🔒 STRICT v4.1: Default permissions aligned to canonical roles + sub-roles.
const BASE_RBAC_ROLE_PERMISSIONS: Partial<RolePermissionsMap> = {
  [UserRole.SUPER_ADMIN]: Object.fromEntries(
    RBAC_MODULES.map((m) => [m.id, { view: true, create: true, edit: true, delete: true }]),
  ),
  [UserRole.CORPORATE_ADMIN]: Object.fromEntries(
    RBAC_MODULES.map((m) => [
      m.id,
      { view: true, create: true, edit: true, delete: m.id !== "qa" },
    ]),
  ),
  [UserRole.ADMIN]: Object.fromEntries(
    RBAC_MODULES.map((m) => [
      m.id,
      { view: true, create: true, edit: true, delete: m.id !== "qa" },
    ]),
  ),
  [UserRole.MANAGER]: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    properties: { view: true, create: true, edit: true, delete: false },
    units: { view: true, create: true, edit: true, delete: false },
    work_orders: { view: true, create: true, edit: true, delete: false },
    approvals: { view: true, create: true, edit: true, delete: false },
    finance: { view: true, create: true, edit: true, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
    marketplace: { view: true, create: false, edit: false, delete: false },
  },
  [UserRole.FM_MANAGER]: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    work_orders: { view: true, create: true, edit: true, delete: false },
    properties: { view: true, create: true, edit: true, delete: false },
    units: { view: true, create: true, edit: true, delete: false },
    approvals: { view: true, create: true, edit: true, delete: false },
    assets_sla: { view: true, create: true, edit: true, delete: false },
    crm_notifications: { view: true, create: true, edit: true, delete: false },
  },
  [UserRole.PROPERTY_MANAGER]: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    work_orders: { view: true, create: true, edit: true, delete: false },
    properties: { view: true, create: false, edit: true, delete: false },
    units: { view: true, create: true, edit: true, delete: false },
    tenants: { view: true, create: true, edit: true, delete: false },
    vendors: { view: true, create: false, edit: false, delete: false },
    finance: { view: true, create: true, edit: true, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
  },
  [UserRole.TECHNICIAN]: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    work_orders: { view: true, create: false, edit: true, delete: false },
    properties: { view: true, create: false, edit: false, delete: false },
    units: { view: true, create: false, edit: false, delete: false },
  },
  [UserRole.FINANCE]: {
    finance: { view: true, create: true, edit: true, delete: false },
    approvals: { view: true, create: false, edit: false, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
    marketplace: { view: true, create: false, edit: false, delete: false },
  },
  [UserRole.FINANCE_OFFICER]: {
    finance: { view: true, create: true, edit: true, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
  },
  [UserRole.HR]: {
    hr: { view: true, create: true, edit: true, delete: false },
    approvals: { view: true, create: false, edit: false, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
  },
  [UserRole.HR_OFFICER]: {
    hr: { view: true, create: true, edit: false, delete: false },
    approvals: { view: true, create: false, edit: false, delete: false },
  },
  [UserRole.SUPPORT_AGENT]: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    work_orders: { view: true, create: true, edit: true, delete: false },
    crm_notifications: { view: true, create: true, edit: true, delete: false },
    marketplace: { view: true, create: false, edit: false, delete: false },
    qa: { view: true, create: false, edit: false, delete: false },
  },
  [UserRole.OPERATIONS_MANAGER]: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    work_orders: { view: true, create: true, edit: true, delete: false },
    properties: { view: true, create: true, edit: true, delete: false },
    units: { view: true, create: true, edit: true, delete: false },
    approvals: { view: true, create: true, edit: true, delete: false },
    assets_sla: { view: true, create: true, edit: true, delete: false },
    crm_notifications: { view: true, create: true, edit: true, delete: false },
  },
  [UserRole.PROCUREMENT]: {
    vendors: { view: true, create: true, edit: true, delete: false },
    approvals: { view: true, create: true, edit: true, delete: false },
    finance: { view: true, create: false, edit: false, delete: false },
  },
  [UserRole.TEAM_MEMBER]: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    work_orders: { view: true, create: true, edit: false, delete: false },
    properties: { view: true, create: false, edit: false, delete: false },
    units: { view: true, create: false, edit: false, delete: false },
  },
  [UserRole.OWNER]: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    properties: { view: true, create: false, edit: false, delete: false },
    units: { view: true, create: false, edit: false, delete: false },
    work_orders: { view: true, create: true, edit: false, delete: false },
    finance: { view: true, create: false, edit: false, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
  },
  [UserRole.CORPORATE_OWNER]: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    properties: { view: true, create: false, edit: false, delete: false },
    units: { view: true, create: false, edit: false, delete: false },
    work_orders: { view: true, create: true, edit: false, delete: false },
    finance: { view: true, create: false, edit: false, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
  },
  [UserRole.TENANT]: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    work_orders: { view: true, create: true, edit: false, delete: false },
    finance: { view: true, create: false, edit: false, delete: false },
  },
  [UserRole.VENDOR]: {
    marketplace: { view: true, create: true, edit: true, delete: false },
    work_orders: { view: true, create: true, edit: true, delete: false },
  },
  [UserRole.AUDITOR]: {
    reports: { view: true, create: false, edit: false, delete: false },
    finance: { view: true, create: false, edit: false, delete: false },
  },
  // 🔒 Souq Marketplace Roles
  [UserRole.SOUQ_ADMIN]: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    marketplace: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, create: false, edit: false, delete: false },
    admin: { view: true, create: true, edit: true, delete: false },
  },
  [UserRole.MARKETPLACE_MODERATOR]: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    marketplace: { view: true, create: false, edit: true, delete: false },
    crm_notifications: { view: true, create: true, edit: true, delete: false },
  },
};

export const RBAC_ROLE_PERMISSIONS: RolePermissionsMap = {
  ...BASE_RBAC_ROLE_PERMISSIONS,
  [UserRole.SUPER_ADMIN]: BASE_RBAC_ROLE_PERMISSIONS[UserRole.SUPER_ADMIN] || {},
  [UserRole.FINANCE_MANAGER]: BASE_RBAC_ROLE_PERMISSIONS[UserRole.FINANCE] || {},
  [UserRole.EMPLOYEE]: BASE_RBAC_ROLE_PERMISSIONS[UserRole.TEAM_MEMBER] || {},
  [UserRole.SUPPORT]: BASE_RBAC_ROLE_PERMISSIONS[UserRole.SUPPORT_AGENT] || {},
  [UserRole.DISPATCHER]: BASE_RBAC_ROLE_PERMISSIONS[UserRole.OPERATIONS_MANAGER] || {},
  [UserRole.CUSTOMER]: BASE_RBAC_ROLE_PERMISSIONS[UserRole.TENANT] || {},
  [UserRole.VIEWER]: BASE_RBAC_ROLE_PERMISSIONS[UserRole.AUDITOR] || {},
} as RolePermissionsMap;

// Legacy roles included for compatibility; default to view-only dashboard.
export const DEFAULT_LEGACY_PERMISSIONS: ModulePermissions = {
  view: true,
  create: false,
  edit: false,
  delete: false,
};

// Shared role labels for UI display to keep labels consistent across apps
export const RBAC_ROLE_LABELS: Record<UserRoleType | string, string> = {
  [UserRole.SUPER_ADMIN]: "Super Admin",
  [UserRole.CORPORATE_ADMIN]: "Corporate Admin",
  [UserRole.ADMIN]: "Admin",
  [UserRole.MANAGER]: "Manager",
  [UserRole.FM_MANAGER]: "FM Manager",
  [UserRole.PROPERTY_MANAGER]: "Property Manager",
  [UserRole.TECHNICIAN]: "Technician",
  [UserRole.FINANCE]: "Finance",
  [UserRole.FINANCE_OFFICER]: "Finance Officer",
  [UserRole.FINANCE_MANAGER]: "Finance Manager",
  [UserRole.HR]: "HR",
  [UserRole.HR_OFFICER]: "HR Officer",
  [UserRole.SUPPORT_AGENT]: "Support Agent",
  [UserRole.OPERATIONS_MANAGER]: "Operations Manager",
  [UserRole.PROCUREMENT]: "Procurement",
  [UserRole.TEAM_MEMBER]: "Team Member",
  [UserRole.OWNER]: "Owner",
  [UserRole.CORPORATE_OWNER]: "Corporate Owner",
  [UserRole.TENANT]: "Tenant / End-User",
  [UserRole.VENDOR]: "Vendor",
  [UserRole.AUDITOR]: "Auditor / QA",
  // Legacy labels
  [UserRole.EMPLOYEE]: "Employee (Legacy)",
  [UserRole.SUPPORT]: "Support (Legacy)",
  [UserRole.DISPATCHER]: "Dispatcher (Legacy)",
  [UserRole.CUSTOMER]: "Customer (Legacy)",
  [UserRole.VIEWER]: "Viewer (Legacy)",
};
