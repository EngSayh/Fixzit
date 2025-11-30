/**
 * Lightweight FM RBAC helpers for client-side usage.
 * Extracted from domain/fm/fm.behavior without any mongoose/server dependencies
 * to avoid pulling server-only code into client bundles.
 */

export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  CORPORATE_OWNER = "CORPORATE_OWNER",
  TEAM_MEMBER = "TEAM_MEMBER",
  TECHNICIAN = "TECHNICIAN",
  PROPERTY_MANAGER = "PROPERTY_MANAGER",
  TENANT = "TENANT",
  VENDOR = "VENDOR",
  GUEST = "GUEST",
  // Legacy aliases removed - use ROLE_ALIAS_MAP for backward compatibility
}

export enum SubRole {
  FINANCE_OFFICER = "FINANCE_OFFICER",
  HR_OFFICER = "HR_OFFICER",
  SUPPORT_AGENT = "SUPPORT_AGENT",
  OPERATIONS_MANAGER = "OPERATIONS_MANAGER",
}

/** Organization subscription plan levels */
export enum Plan {
  STARTER = "STARTER",
  STANDARD = "STANDARD",
  PRO = "PRO",
  ENTERPRISE = "ENTERPRISE",
}

/**
 * Action types for RBAC permission checks.
 * Client-safe subset of actions commonly needed for UI permission checks.
 */
export type Action =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "comment"
  | "upload_media"
  | "assign"
  | "schedule"
  | "dispatch"
  | "submit_estimate"
  | "attach_quote"
  | "request_approval"
  | "approve"
  | "reject"
  | "request_changes"
  | "start_work"
  | "pause_work"
  | "complete_work"
  | "close"
  | "reopen"
  | "export"
  | "share"
  | "link_finance"
  | "link_hr"
  | "link_marketplace"
  | "post_finance";

/**
 * Plan-based feature gates for subscription tiers.
 * Maps plans to submodules that are enabled/disabled.
 * 
 * STRICT v4.1: All domains gated by plan tier with progressive unlocking.
 * - STARTER: Basic WO + Properties (no PM, leases, inspections)
 * - STANDARD: Full WO + Properties + Basic Finance/HR
 * - PRO: All modules except System Management
 * - ENTERPRISE: Full access including System Management
 */
export const PLAN_GATES: Record<Plan, Partial<Record<SubmoduleKey, boolean>>> = {
  [Plan.STARTER]: {
    // Work Orders - Basic
    WO_CREATE: true,
    WO_TRACK_ASSIGN: true,
    WO_PM: false,
    WO_SERVICE_HISTORY: true,
    // Properties - Basic
    PROP_LIST: true,
    PROP_UNITS_TENANTS: true,
    PROP_LEASES: false,
    PROP_INSPECTIONS: false,
    PROP_DOCUMENTS: true,
    // Finance - Disabled
    FINANCE_INVOICES: false,
    FINANCE_EXPENSES: false,
    FINANCE_BUDGETS: false,
    // HR - Disabled
    HR_EMPLOYEE_DIRECTORY: false,
    HR_ATTENDANCE: false,
    HR_PAYROLL: false,
    HR_RECRUITMENT: false,
    HR_TRAINING: false,
    HR_PERFORMANCE: false,
    // Admin - Disabled
    ADMIN_DOA: false,
    ADMIN_POLICIES: false,
    ADMIN_ASSETS: false,
    ADMIN_FACILITIES: false,
    // CRM - Disabled
    CRM_CUSTOMERS: false,
    CRM_LEADS: false,
    CRM_CONTRACTS: false,
    CRM_FEEDBACK: false,
    // Marketplace - Disabled
    MARKETPLACE_VENDORS: false,
    MARKETPLACE_CATALOG: false,
    MARKETPLACE_REQUESTS: false,
    MARKETPLACE_BIDS: false,
    // Support - Basic
    SUPPORT_TICKETS: true,
    SUPPORT_KB: true,
    SUPPORT_CHAT: false,
    SUPPORT_SLA: false,
    // Compliance - Disabled
    COMPLIANCE_CONTRACTS: false,
    COMPLIANCE_DISPUTES: false,
    COMPLIANCE_INSPECTIONS: false,
    // Reports - Disabled
    REPORTS_FINANCE: false,
    REPORTS_OPERATIONS: false,
    REPORTS_COMPLIANCE: false,
    // System - Disabled
    SYSTEM_USERS: false,
    SYSTEM_ROLES: false,
    SYSTEM_BILLING: false,
    SYSTEM_INTEGRATIONS: false,
    SYSTEM_SETTINGS: false,
  },
  [Plan.STANDARD]: {
    // Work Orders - Full
    WO_CREATE: true,
    WO_TRACK_ASSIGN: true,
    WO_PM: true,
    WO_SERVICE_HISTORY: true,
    // Properties - Full
    PROP_LIST: true,
    PROP_UNITS_TENANTS: true,
    PROP_LEASES: true,
    PROP_INSPECTIONS: true,
    PROP_DOCUMENTS: true,
    // Finance - Basic
    FINANCE_INVOICES: true,
    FINANCE_EXPENSES: true,
    FINANCE_BUDGETS: false,
    // HR - Basic
    HR_EMPLOYEE_DIRECTORY: true,
    HR_ATTENDANCE: true,
    HR_PAYROLL: false,
    HR_RECRUITMENT: false,
    HR_TRAINING: false,
    HR_PERFORMANCE: false,
    // Admin - Basic
    ADMIN_DOA: false,
    ADMIN_POLICIES: true,
    ADMIN_ASSETS: true,
    ADMIN_FACILITIES: true,
    // CRM - Basic
    CRM_CUSTOMERS: true,
    CRM_LEADS: true,
    CRM_CONTRACTS: false,
    CRM_FEEDBACK: true,
    // Marketplace - Basic
    MARKETPLACE_VENDORS: true,
    MARKETPLACE_CATALOG: true,
    MARKETPLACE_REQUESTS: true,
    MARKETPLACE_BIDS: false,
    // Support - Full
    SUPPORT_TICKETS: true,
    SUPPORT_KB: true,
    SUPPORT_CHAT: true,
    SUPPORT_SLA: false,
    // Compliance - Disabled
    COMPLIANCE_CONTRACTS: false,
    COMPLIANCE_DISPUTES: false,
    COMPLIANCE_INSPECTIONS: false,
    // Reports - Basic
    REPORTS_FINANCE: false,
    REPORTS_OPERATIONS: true,
    REPORTS_COMPLIANCE: false,
    // System - Disabled
    SYSTEM_USERS: false,
    SYSTEM_ROLES: false,
    SYSTEM_BILLING: false,
    SYSTEM_INTEGRATIONS: false,
    SYSTEM_SETTINGS: false,
  },
  [Plan.PRO]: {
    // Work Orders - Full
    WO_CREATE: true,
    WO_TRACK_ASSIGN: true,
    WO_PM: true,
    WO_SERVICE_HISTORY: true,
    // Properties - Full
    PROP_LIST: true,
    PROP_UNITS_TENANTS: true,
    PROP_LEASES: true,
    PROP_INSPECTIONS: true,
    PROP_DOCUMENTS: true,
    // Finance - Full
    FINANCE_INVOICES: true,
    FINANCE_EXPENSES: true,
    FINANCE_BUDGETS: true,
    // HR - Full
    HR_EMPLOYEE_DIRECTORY: true,
    HR_ATTENDANCE: true,
    HR_PAYROLL: true,
    HR_RECRUITMENT: true,
    HR_TRAINING: true,
    HR_PERFORMANCE: true,
    // Admin - Full except DoA
    ADMIN_DOA: false,
    ADMIN_POLICIES: true,
    ADMIN_ASSETS: true,
    ADMIN_FACILITIES: true,
    // CRM - Full
    CRM_CUSTOMERS: true,
    CRM_LEADS: true,
    CRM_CONTRACTS: true,
    CRM_FEEDBACK: true,
    // Marketplace - Full
    MARKETPLACE_VENDORS: true,
    MARKETPLACE_CATALOG: true,
    MARKETPLACE_REQUESTS: true,
    MARKETPLACE_BIDS: true,
    // Support - Full
    SUPPORT_TICKETS: true,
    SUPPORT_KB: true,
    SUPPORT_CHAT: true,
    SUPPORT_SLA: true,
    // Compliance - Full
    COMPLIANCE_CONTRACTS: true,
    COMPLIANCE_DISPUTES: true,
    COMPLIANCE_INSPECTIONS: true,
    // Reports - Full
    REPORTS_FINANCE: true,
    REPORTS_OPERATIONS: true,
    REPORTS_COMPLIANCE: true,
    // System - Disabled (Enterprise only)
    SYSTEM_USERS: false,
    SYSTEM_ROLES: false,
    SYSTEM_BILLING: false,
    SYSTEM_INTEGRATIONS: false,
    SYSTEM_SETTINGS: false,
  },
  [Plan.ENTERPRISE]: {
    // Work Orders - Full
    WO_CREATE: true,
    WO_TRACK_ASSIGN: true,
    WO_PM: true,
    WO_SERVICE_HISTORY: true,
    // Properties - Full
    PROP_LIST: true,
    PROP_UNITS_TENANTS: true,
    PROP_LEASES: true,
    PROP_INSPECTIONS: true,
    PROP_DOCUMENTS: true,
    // Finance - Full
    FINANCE_INVOICES: true,
    FINANCE_EXPENSES: true,
    FINANCE_BUDGETS: true,
    // HR - Full
    HR_EMPLOYEE_DIRECTORY: true,
    HR_ATTENDANCE: true,
    HR_PAYROLL: true,
    HR_RECRUITMENT: true,
    HR_TRAINING: true,
    HR_PERFORMANCE: true,
    // Admin - Full
    ADMIN_DOA: true,
    ADMIN_POLICIES: true,
    ADMIN_ASSETS: true,
    ADMIN_FACILITIES: true,
    // CRM - Full
    CRM_CUSTOMERS: true,
    CRM_LEADS: true,
    CRM_CONTRACTS: true,
    CRM_FEEDBACK: true,
    // Marketplace - Full
    MARKETPLACE_VENDORS: true,
    MARKETPLACE_CATALOG: true,
    MARKETPLACE_REQUESTS: true,
    MARKETPLACE_BIDS: true,
    // Support - Full
    SUPPORT_TICKETS: true,
    SUPPORT_KB: true,
    SUPPORT_CHAT: true,
    SUPPORT_SLA: true,
    // Compliance - Full
    COMPLIANCE_CONTRACTS: true,
    COMPLIANCE_DISPUTES: true,
    COMPLIANCE_INSPECTIONS: true,
    // Reports - Full
    REPORTS_FINANCE: true,
    REPORTS_OPERATIONS: true,
    REPORTS_COMPLIANCE: true,
    // System - Full
    SYSTEM_USERS: true,
    SYSTEM_ROLES: true,
    SYSTEM_BILLING: true,
    SYSTEM_INTEGRATIONS: true,
    SYSTEM_SETTINGS: true,
  },
};

export enum ModuleKey {
  DASHBOARD = "DASHBOARD",
  WORK_ORDERS = "WORK_ORDERS",
  PROPERTIES = "PROPERTIES",
  FINANCE = "FINANCE",
  HR = "HR",
  ADMINISTRATION = "ADMINISTRATION",
  CRM = "CRM",
  MARKETPLACE = "MARKETPLACE",
  SUPPORT = "SUPPORT",
  COMPLIANCE = "COMPLIANCE",
  REPORTS = "REPORTS",
  SYSTEM_MANAGEMENT = "SYSTEM_MANAGEMENT",
}

export enum SubmoduleKey {
  WO_CREATE = "WO_CREATE",
  WO_TRACK_ASSIGN = "WO_TRACK_ASSIGN",
  WO_PM = "WO_PM",
  WO_SERVICE_HISTORY = "WO_SERVICE_HISTORY",
  PROP_LIST = "PROP_LIST",
  PROP_UNITS_TENANTS = "PROP_UNITS_TENANTS",
  PROP_LEASES = "PROP_LEASES",
  PROP_INSPECTIONS = "PROP_INSPECTIONS",
  PROP_DOCUMENTS = "PROP_DOCUMENTS",
  FINANCE_INVOICES = "FINANCE_INVOICES",
  FINANCE_EXPENSES = "FINANCE_EXPENSES",
  FINANCE_BUDGETS = "FINANCE_BUDGETS",
  HR_EMPLOYEE_DIRECTORY = "HR_EMPLOYEE_DIRECTORY",
  HR_ATTENDANCE = "HR_ATTENDANCE",
  HR_PAYROLL = "HR_PAYROLL",
  HR_RECRUITMENT = "HR_RECRUITMENT",
  HR_TRAINING = "HR_TRAINING",
  HR_PERFORMANCE = "HR_PERFORMANCE",
  ADMIN_DOA = "ADMIN_DOA",
  ADMIN_POLICIES = "ADMIN_POLICIES",
  ADMIN_ASSETS = "ADMIN_ASSETS",
  ADMIN_FACILITIES = "ADMIN_FACILITIES",
  CRM_CUSTOMERS = "CRM_CUSTOMERS",
  CRM_LEADS = "CRM_LEADS",
  CRM_CONTRACTS = "CRM_CONTRACTS",
  CRM_FEEDBACK = "CRM_FEEDBACK",
  MARKETPLACE_VENDORS = "MARKETPLACE_VENDORS",
  MARKETPLACE_CATALOG = "MARKETPLACE_CATALOG",
  MARKETPLACE_REQUESTS = "MARKETPLACE_REQUESTS",
  MARKETPLACE_BIDS = "MARKETPLACE_BIDS",
  SUPPORT_TICKETS = "SUPPORT_TICKETS",
  SUPPORT_KB = "SUPPORT_KB",
  SUPPORT_CHAT = "SUPPORT_CHAT",
  SUPPORT_SLA = "SUPPORT_SLA",
  COMPLIANCE_CONTRACTS = "COMPLIANCE_CONTRACTS",
  COMPLIANCE_DISPUTES = "COMPLIANCE_DISPUTES",
  COMPLIANCE_INSPECTIONS = "COMPLIANCE_INSPECTIONS",
  REPORTS_FINANCE = "REPORTS_FINANCE",
  REPORTS_OPERATIONS = "REPORTS_OPERATIONS",
  REPORTS_COMPLIANCE = "REPORTS_COMPLIANCE",
  SYSTEM_USERS = "SYSTEM_USERS",
  SYSTEM_ROLES = "SYSTEM_ROLES",
  SYSTEM_BILLING = "SYSTEM_BILLING",
  SYSTEM_INTEGRATIONS = "SYSTEM_INTEGRATIONS",
  SYSTEM_SETTINGS = "SYSTEM_SETTINGS",
}

const ROLE_ALIAS_MAP: Record<string, Role> = {
  SUPER_ADMIN: Role.SUPER_ADMIN,
  ADMIN: Role.ADMIN,
  CORPORATE_OWNER: Role.CORPORATE_OWNER,
  TEAM_MEMBER: Role.TEAM_MEMBER,
  TECHNICIAN: Role.TECHNICIAN,
  PROPERTY_MANAGER: Role.PROPERTY_MANAGER,
  TENANT: Role.TENANT,
  VENDOR: Role.VENDOR,
  GUEST: Role.GUEST,
  CORPORATE_ADMIN: Role.ADMIN,
  TENANT_ADMIN: Role.ADMIN,
  CLIENT_ADMIN: Role.ADMIN,
  MANAGEMENT: Role.TEAM_MEMBER,
  MANAGER: Role.TEAM_MEMBER,
  FM_MANAGER: Role.PROPERTY_MANAGER,
  FINANCE: Role.TEAM_MEMBER,
  HR: Role.TEAM_MEMBER,
  PROCUREMENT: Role.TEAM_MEMBER,
  EMPLOYEE: Role.TEAM_MEMBER,
  DISPATCHER: Role.TEAM_MEMBER,
  CORPORATE_STAFF: Role.TEAM_MEMBER,
  FIXZIT_EMPLOYEE: Role.TEAM_MEMBER,
  FINANCE_MANAGER: Role.TEAM_MEMBER,
  HR_MANAGER: Role.TEAM_MEMBER,
  OWNER: Role.CORPORATE_OWNER,
  PROPERTY_OWNER: Role.CORPORATE_OWNER,
  INDIVIDUAL_PROPERTY_OWNER: Role.CORPORATE_OWNER,
  OWNER_DEPUTY: Role.PROPERTY_MANAGER,
  DEPUTY: Role.PROPERTY_MANAGER,
  CUSTOMER: Role.TENANT,
  RESIDENT: Role.TENANT,
  OCCUPANT: Role.TENANT,
  END_USER: Role.TENANT,
  SUPPORT: Role.TEAM_MEMBER,
  AUDITOR: Role.GUEST,
  VIEWER: Role.GUEST,
  FIELD_ENGINEER: Role.TECHNICIAN,
  INTERNAL_TECHNICIAN: Role.TECHNICIAN,
  CONTRACTOR_TECHNICIAN: Role.TECHNICIAN,
  MARKETPLACE_PARTNER: Role.VENDOR,
  SERVICE_PROVIDER: Role.VENDOR,
  SUPPLIER: Role.VENDOR,
};

export function normalizeRole(
  role?: string | Role | null,
  expectedSubRole?: SubRole,
  strict = false,
): Role | null {
  if (!role) return null;
  if (typeof role !== "string") return role;
  const key = role.toUpperCase();
  const normalized =
    ROLE_ALIAS_MAP[key] ?? (Role as Record<string, string>)[key] ?? null;

  if (strict && normalized === Role.TEAM_MEMBER && !expectedSubRole) {
    throw new Error(
      `STRICT v4.1 violation: Role "${role}" maps to TEAM_MEMBER but requires a subRole to be specified`,
    );
  }

  return normalized as Role | null;
}

export function normalizeSubRole(
  subRole?: string | null,
): SubRole | undefined {
  if (!subRole) return undefined;
  const key = subRole.toUpperCase();
  return (Object.values(SubRole) as string[]).includes(key)
    ? (key as SubRole)
    : undefined;
}

export function inferSubRoleFromRole(
  role?: string | Role | null,
): SubRole | undefined {
  if (!role) return undefined;
  const key = typeof role === "string" ? role.toUpperCase() : String(role);
  switch (key) {
    case "FINANCE":
    case "FINANCE_OFFICER":
    case "FINANCE_MANAGER":
      return SubRole.FINANCE_OFFICER;
    case "HR":
    case "HR_OFFICER":
    case "HR_MANAGER":
      return SubRole.HR_OFFICER;
    case "SUPPORT":
    case "SUPPORT_AGENT":
      return SubRole.SUPPORT_AGENT;
    case "OPERATIONS_MANAGER":
    case "DISPATCHER":
      return SubRole.OPERATIONS_MANAGER;
    default:
      return undefined;
  }
}

/* =========================
 * Role-Action Permissions Matrix (Client-Safe)
 * STRICT v4.1 Compliant with Sub-Role Enforcement
 * ========================= */

/** Actions that require technician assignment */
const TECHNICIAN_ASSIGNED_ACTIONS: Action[] = [
  "start_work",
  "pause_work",
  "complete_work",
  "submit_estimate",
  "attach_quote",
];

type ActionsBySubmodule = Partial<Record<SubmoduleKey, Action[]>>;

/**
 * Role-based action permissions for each submodule.
 * Defines what actions each role can perform on each submodule.
 * 
 * STRICT v4.1: All 9 domains covered with least-privilege defaults.
 */
export const ROLE_ACTIONS: Record<Role, ActionsBySubmodule> = {
  [Role.SUPER_ADMIN]: {
    // Work Orders
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: [
      "view", "assign", "schedule", "dispatch", "update", "export",
      "share", "request_approval", "approve", "post_finance",
    ],
    WO_PM: ["view", "create", "update", "export"],
    WO_SERVICE_HISTORY: ["view", "export"],
    // Properties
    PROP_LIST: ["view", "create", "update", "delete", "export"],
    PROP_UNITS_TENANTS: ["view", "create", "update", "delete", "export"],
    PROP_LEASES: ["view", "create", "update", "delete", "export"],
    PROP_INSPECTIONS: ["view", "create", "update", "delete", "export"],
    PROP_DOCUMENTS: ["view", "create", "update", "delete", "export"],
    // Finance
    FINANCE_INVOICES: ["view", "create", "update", "delete", "approve", "export"],
    FINANCE_EXPENSES: ["view", "create", "update", "delete", "approve", "export"],
    FINANCE_BUDGETS: ["view", "create", "update", "delete", "approve", "export"],
    // HR
    HR_EMPLOYEE_DIRECTORY: ["view", "create", "update", "delete", "export"],
    HR_ATTENDANCE: ["view", "create", "update", "delete", "export"],
    HR_PAYROLL: ["view", "create", "update", "delete", "approve", "export"],
    HR_RECRUITMENT: ["view", "create", "update", "delete", "export"],
    HR_TRAINING: ["view", "create", "update", "delete", "export"],
    HR_PERFORMANCE: ["view", "create", "update", "delete", "export"],
    // Admin
    ADMIN_DOA: ["view", "create", "update", "delete", "approve", "export"],
    ADMIN_POLICIES: ["view", "create", "update", "delete", "export"],
    ADMIN_ASSETS: ["view", "create", "update", "delete", "export"],
    ADMIN_FACILITIES: ["view", "create", "update", "delete", "export"],
    // CRM
    CRM_CUSTOMERS: ["view", "create", "update", "delete", "export"],
    CRM_LEADS: ["view", "create", "update", "delete", "assign", "export"],
    CRM_CONTRACTS: ["view", "create", "update", "delete", "approve", "export"],
    CRM_FEEDBACK: ["view", "create", "update", "delete", "export"],
    // Marketplace
    MARKETPLACE_VENDORS: ["view", "create", "update", "delete", "approve", "export"],
    MARKETPLACE_CATALOG: ["view", "create", "update", "delete", "export"],
    MARKETPLACE_REQUESTS: ["view", "create", "update", "delete", "assign", "approve", "export"],
    MARKETPLACE_BIDS: ["view", "create", "update", "delete", "approve", "export"],
    // Support
    SUPPORT_TICKETS: ["view", "create", "update", "delete", "assign", "close", "export"],
    SUPPORT_KB: ["view", "create", "update", "delete", "export"],
    SUPPORT_CHAT: ["view", "create", "update", "export"],
    SUPPORT_SLA: ["view", "create", "update", "delete", "export"],
    // Compliance
    COMPLIANCE_CONTRACTS: ["view", "create", "update", "delete", "approve", "export"],
    COMPLIANCE_DISPUTES: ["view", "create", "update", "delete", "assign", "export"],
    COMPLIANCE_INSPECTIONS: ["view", "create", "update", "delete", "export"],
    // Reports
    REPORTS_FINANCE: ["view", "create", "export"],
    REPORTS_OPERATIONS: ["view", "create", "export"],
    REPORTS_COMPLIANCE: ["view", "create", "export"],
    // System
    SYSTEM_USERS: ["view", "create", "update", "delete", "export"],
    SYSTEM_ROLES: ["view", "create", "update", "delete", "export"],
    SYSTEM_BILLING: ["view", "create", "update", "export"],
    SYSTEM_INTEGRATIONS: ["view", "create", "update", "delete", "export"],
    SYSTEM_SETTINGS: ["view", "update", "export"],
  },
  
  [Role.ADMIN]: {
    // Work Orders - Full org-scoped
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: [
      "view", "assign", "schedule", "dispatch", "update", "export",
      "share", "request_approval", "approve", "post_finance",
    ],
    WO_PM: ["view", "create", "update", "export"],
    WO_SERVICE_HISTORY: ["view", "export"],
    // Properties - Full org-scoped
    PROP_LIST: ["view", "create", "update", "delete", "export"],
    PROP_UNITS_TENANTS: ["view", "create", "update", "delete", "export"],
    PROP_LEASES: ["view", "create", "update", "delete", "export"],
    PROP_INSPECTIONS: ["view", "create", "update", "delete", "export"],
    PROP_DOCUMENTS: ["view", "create", "update", "delete", "export"],
    // Finance - Full org-scoped
    FINANCE_INVOICES: ["view", "create", "update", "delete", "approve", "export"],
    FINANCE_EXPENSES: ["view", "create", "update", "delete", "approve", "export"],
    FINANCE_BUDGETS: ["view", "create", "update", "delete", "approve", "export"],
    // HR - Full org-scoped
    HR_EMPLOYEE_DIRECTORY: ["view", "create", "update", "delete", "export"],
    HR_ATTENDANCE: ["view", "create", "update", "delete", "export"],
    HR_PAYROLL: ["view", "create", "update", "delete", "approve", "export"],
    HR_RECRUITMENT: ["view", "create", "update", "delete", "export"],
    HR_TRAINING: ["view", "create", "update", "delete", "export"],
    HR_PERFORMANCE: ["view", "create", "update", "delete", "export"],
    // Admin - Full org-scoped
    ADMIN_DOA: ["view", "create", "update", "delete", "approve", "export"],
    ADMIN_POLICIES: ["view", "create", "update", "delete", "export"],
    ADMIN_ASSETS: ["view", "create", "update", "delete", "export"],
    ADMIN_FACILITIES: ["view", "create", "update", "delete", "export"],
    // CRM - Full org-scoped
    CRM_CUSTOMERS: ["view", "create", "update", "delete", "export"],
    CRM_LEADS: ["view", "create", "update", "delete", "assign", "export"],
    CRM_CONTRACTS: ["view", "create", "update", "delete", "approve", "export"],
    CRM_FEEDBACK: ["view", "create", "update", "delete", "export"],
    // Marketplace - Full org-scoped
    MARKETPLACE_VENDORS: ["view", "create", "update", "delete", "approve", "export"],
    MARKETPLACE_CATALOG: ["view", "create", "update", "delete", "export"],
    MARKETPLACE_REQUESTS: ["view", "create", "update", "delete", "assign", "approve", "export"],
    MARKETPLACE_BIDS: ["view", "create", "update", "delete", "approve", "export"],
    // Support - Full org-scoped
    SUPPORT_TICKETS: ["view", "create", "update", "delete", "assign", "close", "export"],
    SUPPORT_KB: ["view", "create", "update", "delete", "export"],
    SUPPORT_CHAT: ["view", "create", "update", "export"],
    SUPPORT_SLA: ["view", "create", "update", "delete", "export"],
    // Compliance - Full org-scoped
    COMPLIANCE_CONTRACTS: ["view", "create", "update", "delete", "approve", "export"],
    COMPLIANCE_DISPUTES: ["view", "create", "update", "delete", "assign", "export"],
    COMPLIANCE_INSPECTIONS: ["view", "create", "update", "delete", "export"],
    // Reports - Full org-scoped
    REPORTS_FINANCE: ["view", "create", "export"],
    REPORTS_OPERATIONS: ["view", "create", "export"],
    REPORTS_COMPLIANCE: ["view", "create", "export"],
    // System - Limited (no cross-org)
    SYSTEM_USERS: ["view", "create", "update", "export"],
    SYSTEM_ROLES: ["view", "export"],
    SYSTEM_BILLING: ["view", "export"],
    SYSTEM_INTEGRATIONS: ["view", "update", "export"],
    SYSTEM_SETTINGS: ["view", "update"],
  },
  
  [Role.CORPORATE_OWNER]: {
    // Work Orders - Approval focus
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: ["view", "approve", "reject", "request_changes", "export"],
    WO_PM: ["view"],
    WO_SERVICE_HISTORY: ["view", "export"],
    // Properties - Full ownership
    PROP_LIST: ["view", "create", "update", "export"],
    PROP_UNITS_TENANTS: ["view", "update", "export"],
    PROP_LEASES: ["view", "create", "update", "export"],
    PROP_INSPECTIONS: ["view", "create", "update", "export"],
    PROP_DOCUMENTS: ["view", "create", "update", "export"],
    // Finance - View and approve
    FINANCE_INVOICES: ["view", "approve", "export"],
    FINANCE_EXPENSES: ["view", "approve", "export"],
    FINANCE_BUDGETS: ["view", "approve", "export"],
    // HR - View only (PII restricted)
    HR_EMPLOYEE_DIRECTORY: ["view"],
    // CRM - View own portfolio
    CRM_CUSTOMERS: ["view", "export"],
    CRM_CONTRACTS: ["view", "approve", "export"],
    // Compliance - View
    COMPLIANCE_CONTRACTS: ["view", "export"],
    COMPLIANCE_INSPECTIONS: ["view", "export"],
    // Reports - View own
    REPORTS_FINANCE: ["view", "export"],
    REPORTS_OPERATIONS: ["view", "export"],
  },
  
  [Role.TEAM_MEMBER]: {
    // Work Orders - Basic operations (privileged actions require sub-role)
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: ["view", "update", "export", "request_approval"],
    WO_PM: ["view", "create", "update", "export"],
    // Properties - View only for generic team member
    PROP_LIST: ["view"],
    PROP_DOCUMENTS: ["view"],
    // Support - Basic
    SUPPORT_TICKETS: ["view", "create", "update"],
    SUPPORT_KB: ["view"],
    // NOTE: Finance/HR/etc. access controlled by sub-role in canClient
  },
  
  [Role.TECHNICIAN]: {
    // Work Orders - Field work
    WO_CREATE: ["view", "comment"],
    WO_TRACK_ASSIGN: [
      "view", "update", ...TECHNICIAN_ASSIGNED_ACTIONS, "upload_media",
    ],
    WO_PM: ["view", "update"],
    WO_SERVICE_HISTORY: ["view"],
    // Properties - View assigned
    PROP_LIST: ["view"],
    PROP_DOCUMENTS: ["view"],
    // Support - Basic
    SUPPORT_TICKETS: ["view", "create", "comment"],
    SUPPORT_KB: ["view"],
  },
  
  [Role.PROPERTY_MANAGER]: {
    // Work Orders - Manage for assigned properties
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: [
      "view", "assign", "schedule", "dispatch", "update",
      "export", "share", "approve",
    ],
    WO_PM: ["view", "export"],
    WO_SERVICE_HISTORY: ["view", "export"],
    // Properties - Manage assigned
    PROP_LIST: ["view", "update", "export"],
    PROP_UNITS_TENANTS: ["view", "update", "export"],
    PROP_LEASES: ["view", "export"],
    PROP_INSPECTIONS: ["view", "create", "update", "export"],
    PROP_DOCUMENTS: ["view", "create", "update", "export"],
    // CRM - Tenant relations
    CRM_CUSTOMERS: ["view", "update"],
    CRM_FEEDBACK: ["view", "create", "update"],
    // Support - Property-scoped
    SUPPORT_TICKETS: ["view", "create", "update", "assign"],
    SUPPORT_KB: ["view"],
    // Compliance - Property-scoped
    COMPLIANCE_INSPECTIONS: ["view", "create", "update"],
  },
  
  [Role.TENANT]: {
    // Work Orders - Create and view own
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: ["view", "comment"],
    WO_PM: ["view"],
    WO_SERVICE_HISTORY: ["view"],
    // Properties - View own unit
    PROP_LIST: ["view"],
    PROP_UNITS_TENANTS: ["view"],
    PROP_DOCUMENTS: ["view"],
    // Support - Own tickets
    SUPPORT_TICKETS: ["view", "create", "comment"],
    SUPPORT_KB: ["view"],
    SUPPORT_CHAT: ["view", "create"],
  },
  
  [Role.VENDOR]: {
    // Work Orders - Assigned jobs
    WO_CREATE: ["view", "comment"],
    WO_TRACK_ASSIGN: [
      "view", "submit_estimate", "attach_quote", "upload_media", "complete_work",
    ],
    WO_PM: ["view"],
    WO_SERVICE_HISTORY: ["view"],
    // Marketplace - Own bids
    MARKETPLACE_BIDS: ["view", "create", "update"],
    MARKETPLACE_REQUESTS: ["view"],
    // Support - Basic
    SUPPORT_TICKETS: ["view", "create", "comment"],
    SUPPORT_KB: ["view"],
  },
  
  [Role.GUEST]: {
    // Public access only
    SUPPORT_KB: ["view"],
  },
};

/**
 * Sub-role specific action extensions for TEAM_MEMBER.
 * STRICT v4.1: Team members require sub-role for specialized access.
 */
export const SUB_ROLE_ACTIONS: Record<SubRole, ActionsBySubmodule> = {
  [SubRole.FINANCE_OFFICER]: {
    // Finance - Full access
    FINANCE_INVOICES: ["view", "create", "update", "approve", "export"],
    FINANCE_EXPENSES: ["view", "create", "update", "approve", "export"],
    FINANCE_BUDGETS: ["view", "create", "update", "export"],
    // Work Orders - Finance linking
    WO_TRACK_ASSIGN: ["view", "update", "export", "request_approval", "approve", "post_finance"],
    // Reports - Finance
    REPORTS_FINANCE: ["view", "create", "export"],
  },
  [SubRole.HR_OFFICER]: {
    // HR - Full access (including PII)
    HR_EMPLOYEE_DIRECTORY: ["view", "create", "update", "export"],
    HR_ATTENDANCE: ["view", "create", "update", "export"],
    HR_PAYROLL: ["view", "create", "update", "approve", "export"],
    HR_RECRUITMENT: ["view", "create", "update", "export"],
    HR_TRAINING: ["view", "create", "update", "export"],
    HR_PERFORMANCE: ["view", "create", "update", "export"],
    // Reports - HR
    REPORTS_OPERATIONS: ["view", "export"],
  },
  [SubRole.SUPPORT_AGENT]: {
    // Support - Full access
    SUPPORT_TICKETS: ["view", "create", "update", "assign", "close", "export"],
    SUPPORT_KB: ["view", "create", "update"],
    SUPPORT_CHAT: ["view", "create", "update"],
    SUPPORT_SLA: ["view"],
    // CRM - Customer interactions
    CRM_CUSTOMERS: ["view", "update"],
    CRM_FEEDBACK: ["view", "create", "update"],
    // Work Orders - Support escalation
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: ["view", "update", "assign", "export"],
  },
  [SubRole.OPERATIONS_MANAGER]: {
    // Work Orders - Full operations
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: ["view", "assign", "schedule", "dispatch", "update", "export", "approve"],
    WO_PM: ["view", "create", "update", "export"],
    WO_SERVICE_HISTORY: ["view", "export"],
    // Properties - Operations view
    PROP_LIST: ["view", "update", "export"],
    PROP_INSPECTIONS: ["view", "create", "update", "export"],
    // Marketplace - Vendor management
    MARKETPLACE_VENDORS: ["view", "update"],
    MARKETPLACE_REQUESTS: ["view", "create", "update", "assign", "approve"],
    MARKETPLACE_BIDS: ["view", "approve"],
    // Reports - Operations
    REPORTS_OPERATIONS: ["view", "create", "export"],
  },
};

/* =========================
 * Client-Safe Permission Context & Check
 * ========================= */

/**
 * Simplified resource context for client-side permission checks.
 * Does not include server-only fields like vendorId, assignedProperties.
 */
export type ClientResourceCtx = {
  role: Role;
  subRole?: SubRole;
  plan: Plan;
  userId: string;
  orgId?: string;
  propertyId?: string;
  isOrgMember: boolean;
  isTechnicianAssigned?: boolean;
};

/**
 * Submodules that require specific sub-roles for TEAM_MEMBER access.
 * STRICT v4.1: TEAM_MEMBER without sub-role cannot access specialized domains.
 */
const SUBMODULE_REQUIRED_SUBROLE: Partial<Record<SubmoduleKey, SubRole[]>> = {
  // Finance requires FINANCE_OFFICER
  FINANCE_INVOICES: [SubRole.FINANCE_OFFICER],
  FINANCE_EXPENSES: [SubRole.FINANCE_OFFICER],
  FINANCE_BUDGETS: [SubRole.FINANCE_OFFICER],
  REPORTS_FINANCE: [SubRole.FINANCE_OFFICER],
  // HR requires HR_OFFICER
  HR_EMPLOYEE_DIRECTORY: [SubRole.HR_OFFICER],
  HR_ATTENDANCE: [SubRole.HR_OFFICER],
  HR_PAYROLL: [SubRole.HR_OFFICER],
  HR_RECRUITMENT: [SubRole.HR_OFFICER],
  HR_TRAINING: [SubRole.HR_OFFICER],
  HR_PERFORMANCE: [SubRole.HR_OFFICER],
  // Support requires SUPPORT_AGENT (for advanced actions)
  SUPPORT_SLA: [SubRole.SUPPORT_AGENT],
  // Operations requires OPERATIONS_MANAGER
  MARKETPLACE_VENDORS: [SubRole.OPERATIONS_MANAGER],
  MARKETPLACE_REQUESTS: [SubRole.OPERATIONS_MANAGER],
  MARKETPLACE_BIDS: [SubRole.OPERATIONS_MANAGER],
};

/**
 * Client-safe permission check function.
 * 
 * 🔒 SINGLE SOURCE OF TRUTH for all client-side permission checks.
 * All UI permission checks (useFMPermissions, route guards, menu visibility)
 * MUST route through this function to ensure consistent plan gating and
 * sub-role enforcement.
 * 
 * Checks performed in order:
 * 1. Plan gate - subscription tier allows this submodule
 * 2. Org membership - user belongs to target org (SUPER_ADMIN bypasses)
 * 3. Sub-role enforcement - TEAM_MEMBER requires specific sub-role for restricted modules
 * 4. Role action allow-list - role has permission for this action on this submodule
 * 5. Technician assignment - field actions require assignment to work order
 * 
 * STRICT v4.1 Compliant: Enforces sub-role requirements for TEAM_MEMBER.
 * 
 * @example
 * // In useFMPermissions hook:
 * const canPerform = (submodule, action, options) => canClient(submodule, action, buildClientCtx(options));
 * 
 * @param submodule - The submodule to check access for (e.g., FINANCE_INVOICES)
 * @param action - The action to perform (e.g., "view", "create")
 * @param ctx - Client resource context with role, plan, org membership
 * @returns true if the user can perform the action on the submodule
 */
export function canClient(
  submodule: SubmoduleKey,
  action: Action,
  ctx: ClientResourceCtx,
): boolean {
  // 1) Plan gate - check if plan allows this submodule
  if (!PLAN_GATES[ctx.plan]?.[submodule]) return false;

  // 2) Basic org membership check (Super Admin bypasses)
  if (!ctx.isOrgMember && ctx.role !== Role.SUPER_ADMIN) return false;

  // 3) STRICT v4.1: Sub-role enforcement for TEAM_MEMBER
  if (ctx.role === Role.TEAM_MEMBER) {
    // Check sub-role actions first (extends base TEAM_MEMBER permissions)
    if (ctx.subRole && SUB_ROLE_ACTIONS[ctx.subRole]?.[submodule]?.includes(action)) {
      return true;
    }
    
    // Check if this submodule requires a specific sub-role for TEAM_MEMBER access
    const requiredSubRoles = SUBMODULE_REQUIRED_SUBROLE[submodule];
    if (requiredSubRoles && requiredSubRoles.length > 0) {
      // Submodule requires a sub-role that the user doesn't have
      if (!ctx.subRole || !requiredSubRoles.includes(ctx.subRole)) {
        return false;
      }
    }
  }

  // 4) Role action allow-list
  const allowed = ROLE_ACTIONS[ctx.role]?.[submodule];
  if (!allowed?.includes(action)) return false;

  // 5) Technician assignment check for specific actions
  if (
    ctx.role === Role.TECHNICIAN &&
    TECHNICIAN_ASSIGNED_ACTIONS.includes(action)
  ) {
    return !!ctx.isTechnicianAssigned;
  }

  return true;
}

/**
 * Check if a user can access a specific submodule at all (any action).
 * Useful for showing/hiding menu items.
 */
export function canAccessSubmodule(
  submodule: SubmoduleKey,
  ctx: ClientResourceCtx,
): boolean {
  // Plan gate first
  if (!PLAN_GATES[ctx.plan]?.[submodule]) return false;
  
  // Check if role has any actions for this submodule
  const roleActions = ROLE_ACTIONS[ctx.role]?.[submodule];
  
  // For TEAM_MEMBER, also check sub-role actions
  if (ctx.role === Role.TEAM_MEMBER && ctx.subRole) {
    const subRoleActions = SUB_ROLE_ACTIONS[ctx.subRole]?.[submodule];
    if (subRoleActions && subRoleActions.length > 0) return true;
  }
  
  return roleActions !== undefined && roleActions.length > 0;
}
