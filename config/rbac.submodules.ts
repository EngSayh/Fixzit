/**
 * RBAC Sub-Modules Configuration
 * 
 * Defines granular sub-modules for each main RBAC module.
 * Used for fine-grained permission control beyond role defaults.
 * 
 * @module config/rbac.submodules
 */

import { UserRole, type UserRoleType } from "@/types/user";
import { type ModulePermissions } from "./rbac.matrix";

export interface SubModulePermissions extends ModulePermissions {
  export?: boolean;
  approve?: boolean;
  admin?: boolean;
}

export interface SubModule {
  id: string;
  parentId: string;
  label: string;
  description: string;
  /** Default permissions inherited from parent if not specified */
  defaultPermissions?: Partial<SubModulePermissions>;
}

/**
 * Sub-modules for all main RBAC modules
 * ~80 sub-modules covering all major features
 */
export const RBAC_SUBMODULES: SubModule[] = [
  // Dashboard sub-modules
  { id: "dashboard.overview", parentId: "dashboard", label: "Overview", description: "Main dashboard view" },
  { id: "dashboard.kpis", parentId: "dashboard", label: "KPIs", description: "Key performance indicators" },
  { id: "dashboard.charts", parentId: "dashboard", label: "Charts & Analytics", description: "Visual analytics" },
  { id: "dashboard.alerts", parentId: "dashboard", label: "Alerts Widget", description: "Dashboard alerts" },
  
  // Properties sub-modules
  { id: "properties.list", parentId: "properties", label: "Property List", description: "View all properties" },
  { id: "properties.details", parentId: "properties", label: "Property Details", description: "View/edit property details" },
  { id: "properties.documents", parentId: "properties", label: "Property Documents", description: "Property document management" },
  { id: "properties.media", parentId: "properties", label: "Property Media", description: "Photos and videos" },
  { id: "properties.settings", parentId: "properties", label: "Property Settings", description: "Property configuration" },
  
  // Units sub-modules
  { id: "units.list", parentId: "units", label: "Unit List", description: "View all units" },
  { id: "units.details", parentId: "units", label: "Unit Details", description: "View/edit unit details" },
  { id: "units.leasing", parentId: "units", label: "Unit Leasing", description: "Lease management" },
  { id: "units.occupancy", parentId: "units", label: "Occupancy", description: "Occupancy tracking" },
  { id: "units.amenities", parentId: "units", label: "Amenities", description: "Unit amenities" },
  
  // Tenants sub-modules
  { id: "tenants.list", parentId: "tenants", label: "Tenant List", description: "View all tenants" },
  { id: "tenants.profiles", parentId: "tenants", label: "Tenant Profiles", description: "Tenant profile management" },
  { id: "tenants.leases", parentId: "tenants", label: "Lease Contracts", description: "Lease contract management" },
  { id: "tenants.payments", parentId: "tenants", label: "Tenant Payments", description: "Payment history" },
  { id: "tenants.communications", parentId: "tenants", label: "Communications", description: "Tenant communications" },
  
  // Vendors sub-modules
  { id: "vendors.list", parentId: "vendors", label: "Vendor List", description: "View all vendors" },
  { id: "vendors.profiles", parentId: "vendors", label: "Vendor Profiles", description: "Vendor profile management" },
  { id: "vendors.contracts", parentId: "vendors", label: "Vendor Contracts", description: "Contract management" },
  { id: "vendors.ratings", parentId: "vendors", label: "Ratings & Reviews", description: "Vendor ratings" },
  { id: "vendors.payments", parentId: "vendors", label: "Vendor Payments", description: "Payment tracking" },
  
  // Work Orders sub-modules
  { id: "work_orders.list", parentId: "work_orders", label: "Work Order List", description: "View all work orders" },
  { id: "work_orders.create", parentId: "work_orders", label: "Create Work Order", description: "Create new work orders" },
  { id: "work_orders.assignments", parentId: "work_orders", label: "Assignments", description: "Technician assignments" },
  { id: "work_orders.scheduling", parentId: "work_orders", label: "Scheduling", description: "Work order scheduling" },
  { id: "work_orders.completion", parentId: "work_orders", label: "Completion", description: "Work order completion" },
  { id: "work_orders.history", parentId: "work_orders", label: "History", description: "Work order history" },
  
  // Approvals sub-modules
  { id: "approvals.pending", parentId: "approvals", label: "Pending Approvals", description: "Items awaiting approval" },
  { id: "approvals.sla", parentId: "approvals", label: "SLA Decisions", description: "SLA-related approvals" },
  { id: "approvals.workflows", parentId: "approvals", label: "Approval Workflows", description: "Workflow configuration" },
  { id: "approvals.history", parentId: "approvals", label: "Approval History", description: "Past approvals" },
  
  // Assets & SLA sub-modules
  { id: "assets_sla.assets", parentId: "assets_sla", label: "Asset Registry", description: "Asset management" },
  { id: "assets_sla.pm_schedules", parentId: "assets_sla", label: "PM Schedules", description: "Preventive maintenance" },
  { id: "assets_sla.sla_tracking", parentId: "assets_sla", label: "SLA Tracking", description: "SLA monitoring" },
  { id: "assets_sla.warranties", parentId: "assets_sla", label: "Warranties", description: "Warranty management" },
  { id: "assets_sla.inspections", parentId: "assets_sla", label: "Inspections", description: "Asset inspections" },
  
  // Finance sub-modules
  { id: "finance.invoices", parentId: "finance", label: "Invoices", description: "Invoice management" },
  { id: "finance.payments", parentId: "finance", label: "Payments", description: "Payment processing" },
  { id: "finance.zatca", parentId: "finance", label: "ZATCA Compliance", description: "ZATCA e-invoicing" },
  { id: "finance.budgets", parentId: "finance", label: "Budgets", description: "Budget management" },
  { id: "finance.expenses", parentId: "finance", label: "Expenses", description: "Expense tracking" },
  { id: "finance.reports", parentId: "finance", label: "Financial Reports", description: "Financial reporting" },
  { id: "finance.reconciliation", parentId: "finance", label: "Reconciliation", description: "Account reconciliation" },
  
  // Marketplace sub-modules
  { id: "marketplace.listings", parentId: "marketplace", label: "Listings", description: "Product/service listings" },
  { id: "marketplace.orders", parentId: "marketplace", label: "Orders", description: "Order management" },
  { id: "marketplace.claims", parentId: "marketplace", label: "Claims & Returns", description: "Claims processing" },
  { id: "marketplace.settlements", parentId: "marketplace", label: "Settlements", description: "Settlement management" },
  { id: "marketplace.vendors", parentId: "marketplace", label: "Marketplace Vendors", description: "Vendor management" },
  { id: "marketplace.analytics", parentId: "marketplace", label: "Marketplace Analytics", description: "Sales analytics" },
  
  // CRM & Notifications sub-modules
  { id: "crm_notifications.customers", parentId: "crm_notifications", label: "Customers", description: "Customer management" },
  { id: "crm_notifications.communications", parentId: "crm_notifications", label: "Communications", description: "Communication logs" },
  { id: "crm_notifications.templates", parentId: "crm_notifications", label: "Templates", description: "Message templates" },
  { id: "crm_notifications.alerts", parentId: "crm_notifications", label: "Alerts", description: "Alert configuration" },
  { id: "crm_notifications.campaigns", parentId: "crm_notifications", label: "Campaigns", description: "Marketing campaigns" },
  
  // HR sub-modules
  { id: "hr.employees", parentId: "hr", label: "Employees", description: "Employee management" },
  { id: "hr.payroll", parentId: "hr", label: "Payroll", description: "Payroll processing" },
  { id: "hr.attendance", parentId: "hr", label: "Attendance", description: "Attendance tracking" },
  { id: "hr.leave", parentId: "hr", label: "Leave Management", description: "Leave requests" },
  { id: "hr.recruitment", parentId: "hr", label: "Recruitment", description: "Hiring management" },
  { id: "hr.performance", parentId: "hr", label: "Performance", description: "Performance reviews" },
  
  // Reports sub-modules
  { id: "reports.operational", parentId: "reports", label: "Operational Reports", description: "Operations reporting" },
  { id: "reports.financial", parentId: "reports", label: "Financial Reports", description: "Financial reporting" },
  { id: "reports.maintenance", parentId: "reports", label: "Maintenance Reports", description: "Maintenance analytics" },
  { id: "reports.custom", parentId: "reports", label: "Custom Reports", description: "Custom report builder" },
  { id: "reports.scheduled", parentId: "reports", label: "Scheduled Reports", description: "Automated reports" },
  
  // Admin sub-modules
  { id: "admin.users", parentId: "admin", label: "User Management", description: "User administration" },
  { id: "admin.roles", parentId: "admin", label: "Roles & Permissions", description: "RBAC configuration" },
  { id: "admin.org_settings", parentId: "admin", label: "Organization Settings", description: "Org configuration" },
  { id: "admin.integrations", parentId: "admin", label: "Integrations", description: "Third-party integrations" },
  { id: "admin.audit_logs", parentId: "admin", label: "Audit Logs", description: "Activity audit trail" },
  { id: "admin.billing", parentId: "admin", label: "Billing", description: "Subscription & billing" },
  
  // QA & Telemetry sub-modules
  { id: "qa.alerts", parentId: "qa", label: "QA Alerts", description: "Quality alerts" },
  { id: "qa.logs", parentId: "qa", label: "System Logs", description: "Application logs" },
  { id: "qa.telemetry", parentId: "qa", label: "Telemetry", description: "Platform telemetry" },
  { id: "qa.monitoring", parentId: "qa", label: "Monitoring", description: "System monitoring" },
  { id: "qa.health", parentId: "qa", label: "Health Checks", description: "Service health" },
];

/**
 * Get sub-modules for a parent module
 */
export function getSubModulesForParent(parentId: string): SubModule[] {
  return RBAC_SUBMODULES.filter((sub) => sub.parentId === parentId);
}

/**
 * Get effective permissions for a sub-module based on role
 * Falls back to parent module permissions
 */
export function getSubModulePermissions(
  role: UserRoleType,
  subModuleId: string,
  parentPermissions: ModulePermissions
): SubModulePermissions {
  const subModule = RBAC_SUBMODULES.find((s) => s.id === subModuleId);
  
  if (!subModule) {
    return {
      ...parentPermissions,
      export: false,
      approve: false,
      admin: false,
    };
  }
  
  // Check for role-specific sub-module overrides
  const roleOverrides = SUB_MODULE_ROLE_OVERRIDES[role];
  const override = roleOverrides?.[subModuleId];
  
  if (override) {
    return {
      ...parentPermissions,
      ...override,
    };
  }
  
  // Use default permissions if specified
  if (subModule.defaultPermissions) {
    return {
      ...parentPermissions,
      export: false,
      approve: false,
      admin: false,
      ...subModule.defaultPermissions,
    };
  }
  
  // Fall back to parent permissions with extended fields
  return {
    ...parentPermissions,
    export: false,
    approve: false,
    admin: false,
  };
}

/**
 * Role-specific sub-module permission overrides
 * Only specify when different from parent module defaults
 */
const SUB_MODULE_ROLE_OVERRIDES: Partial<
  Record<UserRoleType, Record<string, Partial<SubModulePermissions>>>
> = {
  [UserRole.SUPER_ADMIN]: {
    // Super admin has full access to all sub-modules
    "admin.audit_logs": { view: true, create: false, edit: false, delete: true, export: true, admin: true },
    "qa.telemetry": { view: true, create: false, edit: false, delete: true, export: true, admin: true },
  },
  
  [UserRole.FINANCE]: {
    // Finance role gets export on financial reports
    "finance.reports": { view: true, create: true, edit: false, delete: false, export: true },
    "finance.reconciliation": { view: true, create: true, edit: true, delete: false, approve: true },
  },
  
  [UserRole.FINANCE_OFFICER]: {
    "finance.reports": { view: true, create: false, edit: false, delete: false, export: true },
  },
  
  [UserRole.HR]: {
    // HR gets full access to employee management
    "hr.employees": { view: true, create: true, edit: true, delete: false, export: true },
    "hr.payroll": { view: true, create: true, edit: true, delete: false, approve: true },
  },
  
  [UserRole.MANAGER]: {
    // Managers can approve work orders
    "work_orders.completion": { view: true, create: false, edit: true, delete: false, approve: true },
    "approvals.pending": { view: true, create: false, edit: true, delete: false, approve: true },
  },
  
  [UserRole.FM_MANAGER]: {
    // FM Managers can approve assets
    "assets_sla.assets": { view: true, create: true, edit: true, delete: false, approve: true },
    "assets_sla.pm_schedules": { view: true, create: true, edit: true, delete: false, approve: true },
  },
  
  [UserRole.TECHNICIAN]: {
    // Technicians can only view and update assigned work orders
    "work_orders.assignments": { view: true, create: false, edit: true, delete: false },
    "work_orders.completion": { view: true, create: false, edit: true, delete: false },
  },
};
