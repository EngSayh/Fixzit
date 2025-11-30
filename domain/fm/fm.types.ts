/**
 * domain/fm/fm.types.ts
 *
 * CLIENT-SAFE FM Domain Types, Enums, and Pure Functions
 *
 * This file contains ONLY exports that are safe for client-side bundling:
 * - Enums (Role, Plan, SubRole, ModuleKey, SubmoduleKey, WOStatus)
 * - Types (Action, ResourceCtx)
 * - Constants (SLA, PLAN_GATES, ROLE_ALIAS_MAP, etc.)
 * - Pure functions (normalizeRole, computeAllowedModules, canAccessModule, can)
 *
 * ⚠️  This file MUST NOT import mongoose or any server-only dependencies.
 *
 * For client components, import from this file:
 *   import { Role, can, Plan } from "@/domain/fm/fm.types";
 *
 * For server code that needs mongoose models, import from:
 *   import { FMProperty, FMWorkOrder } from "@/domain/fm/fm.behavior";
 *
 * STRICT v4.1 COMPLIANT - Governance V5/V6 Aligned
 */

/* =========================
 * 1) Enums & Constants
 * ========================= */

export enum Role {
  // STRICT v4.1 Canonical Roles
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  CORPORATE_OWNER = "CORPORATE_OWNER",
  TEAM_MEMBER = "TEAM_MEMBER",
  TECHNICIAN = "TECHNICIAN",
  PROPERTY_MANAGER = "PROPERTY_MANAGER",
  TENANT = "TENANT",
  VENDOR = "VENDOR",
  GUEST = "GUEST",

  // Legacy aliases (deprecated, use canonical names above)
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  CORPORATE_ADMIN = "ADMIN",
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  MANAGEMENT = "TEAM_MEMBER",
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  FINANCE = "TEAM_MEMBER",
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  HR = "TEAM_MEMBER",
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  EMPLOYEE = "TEAM_MEMBER",
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  PROPERTY_OWNER = "CORPORATE_OWNER",
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  OWNER_DEPUTY = "PROPERTY_MANAGER",
}

export enum Plan {
  STARTER = "STARTER",
  STANDARD = "STANDARD",
  PRO = "PRO",
  ENTERPRISE = "ENTERPRISE",
}

export enum SubRole {
  FINANCE_OFFICER = "FINANCE_OFFICER",
  HR_OFFICER = "HR_OFFICER",
  SUPPORT_AGENT = "SUPPORT_AGENT",
  OPERATIONS_MANAGER = "OPERATIONS_MANAGER",
}

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
  // Work Orders
  WO_CREATE = "WO_CREATE",
  WO_TRACK_ASSIGN = "WO_TRACK_ASSIGN",
  WO_PM = "WO_PM",
  WO_SERVICE_HISTORY = "WO_SERVICE_HISTORY",
  // Properties
  PROP_LIST = "PROP_LIST",
  PROP_UNITS_TENANTS = "PROP_UNITS_TENANTS",
  PROP_LEASES = "PROP_LEASES",
  PROP_INSPECTIONS = "PROP_INSPECTIONS",
  PROP_DOCUMENTS = "PROP_DOCUMENTS",
  // Finance
  FINANCE_INVOICES = "FINANCE_INVOICES",
  FINANCE_EXPENSES = "FINANCE_EXPENSES",
  FINANCE_BUDGETS = "FINANCE_BUDGETS",
  // HR
  HR_EMPLOYEE_DIRECTORY = "HR_EMPLOYEE_DIRECTORY",
  HR_ATTENDANCE = "HR_ATTENDANCE",
  HR_PAYROLL = "HR_PAYROLL",
  HR_RECRUITMENT = "HR_RECRUITMENT",
  HR_TRAINING = "HR_TRAINING",
  HR_PERFORMANCE = "HR_PERFORMANCE",
  // Administration
  ADMIN_DOA = "ADMIN_DOA",
  ADMIN_POLICIES = "ADMIN_POLICIES",
  ADMIN_ASSETS = "ADMIN_ASSETS",
  ADMIN_FACILITIES = "ADMIN_FACILITIES",
  // CRM
  CRM_CUSTOMERS = "CRM_CUSTOMERS",
  CRM_LEADS = "CRM_LEADS",
  CRM_CONTRACTS = "CRM_CONTRACTS",
  CRM_FEEDBACK = "CRM_FEEDBACK",
  // Marketplace
  MARKETPLACE_VENDORS = "MARKETPLACE_VENDORS",
  MARKETPLACE_CATALOG = "MARKETPLACE_CATALOG",
  MARKETPLACE_REQUESTS = "MARKETPLACE_REQUESTS",
  MARKETPLACE_BIDS = "MARKETPLACE_BIDS",
  // Support
  SUPPORT_TICKETS = "SUPPORT_TICKETS",
  SUPPORT_KB = "SUPPORT_KB",
  SUPPORT_CHAT = "SUPPORT_CHAT",
  SUPPORT_SLA = "SUPPORT_SLA",
  // Compliance
  COMPLIANCE_CONTRACTS = "COMPLIANCE_CONTRACTS",
  COMPLIANCE_DISPUTES = "COMPLIANCE_DISPUTES",
  COMPLIANCE_INSPECTIONS = "COMPLIANCE_INSPECTIONS",
  // Reports
  REPORTS_FINANCE = "REPORTS_FINANCE",
  REPORTS_OPERATIONS = "REPORTS_OPERATIONS",
  REPORTS_COMPLIANCE = "REPORTS_COMPLIANCE",
  // System Management
  SYSTEM_USERS = "SYSTEM_USERS",
  SYSTEM_ROLES = "SYSTEM_ROLES",
  SYSTEM_BILLING = "SYSTEM_BILLING",
  SYSTEM_INTEGRATIONS = "SYSTEM_INTEGRATIONS",
  SYSTEM_SETTINGS = "SYSTEM_SETTINGS",
}

export enum WOStatus {
  NEW = "NEW",
  ASSESSMENT = "ASSESSMENT",
  ESTIMATE_PENDING = "ESTIMATE_PENDING",
  QUOTATION_REVIEW = "QUOTATION_REVIEW",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  IN_PROGRESS = "IN_PROGRESS",
  WORK_COMPLETE = "WORK_COMPLETE",
  QUALITY_CHECK = "QUALITY_CHECK",
  FINANCIAL_POSTING = "FINANCIAL_POSTING",
  CLOSED = "CLOSED",
}

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

/* =========================
 * 2) SLA Configuration
 * ========================= */

export const SLA = {
  P1: { responseMins: 30, resolutionHours: 6 },
  P2: { responseMins: 120, resolutionHours: 24 },
  P3: { responseMins: 480, resolutionHours: 72 },
} as const;

/* =========================
 * 3) Plan Gates
 * STRICT v4.1: All domains gated by plan tier with progressive unlocking.
 * ========================= */

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
    ADMIN_FACILITIES: false,
    // CRM - Basic
    CRM_CUSTOMERS: true,
    CRM_LEADS: true,
    CRM_CONTRACTS: false,
    CRM_FEEDBACK: true,
    // Marketplace - Basic
    MARKETPLACE_VENDORS: true,
    MARKETPLACE_CATALOG: true,
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

/* =========================
 * 4) Role Normalization
 * ========================= */

export const ROLE_ALIAS_MAP: Record<string, Role> = {
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
  AUDITOR: Role.GUEST, // SEC: Auditors should have read-only GUEST access, not TEAM_MEMBER
  VIEWER: Role.GUEST,
  FIELD_ENGINEER: Role.TECHNICIAN,
  INTERNAL_TECHNICIAN: Role.TECHNICIAN,
  CONTRACTOR_TECHNICIAN: Role.TECHNICIAN,
  MARKETPLACE_PARTNER: Role.VENDOR,
  SERVICE_PROVIDER: Role.VENDOR,
  SUPPLIER: Role.VENDOR,
};

export function normalizeRole(role?: string | Role | null): Role | null {
  if (!role) return null;
  if (typeof role !== "string") return role;
  const key = role.toUpperCase();
  return ROLE_ALIAS_MAP[key] ?? ((Role as Record<string, string>)[key] as Role) ?? null;
}

/** Normalizes sub-role strings to SubRole enum */
export function normalizeSubRole(subRole?: string | null): SubRole | undefined {
  if (!subRole) return undefined;
  const key = subRole.toUpperCase();
  return (Object.values(SubRole) as string[]).includes(key)
    ? (key as SubRole)
    : undefined;
}

/** Infers sub-role from a raw role string when explicit subRole is missing */
export function inferSubRoleFromRole(role?: string | Role | null): SubRole | undefined {
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
 * 5) Role → Module Access
 * ========================= */

export const ROLE_MODULE_ACCESS: Record<Role, Partial<Record<ModuleKey, boolean>>> = {
  [Role.SUPER_ADMIN]: {
    DASHBOARD: true,
    WORK_ORDERS: true,
    PROPERTIES: true,
    FINANCE: true,
    HR: true,
    ADMINISTRATION: true,
    CRM: true,
    MARKETPLACE: true,
    SUPPORT: true,
    COMPLIANCE: true,
    REPORTS: true,
    SYSTEM_MANAGEMENT: true,
  },
  [Role.ADMIN]: {
    DASHBOARD: true,
    WORK_ORDERS: true,
    PROPERTIES: true,
    FINANCE: true,
    HR: true,
    ADMINISTRATION: true,
    CRM: true,
    MARKETPLACE: true,
    SUPPORT: true,
    COMPLIANCE: true,
    REPORTS: true,
    SYSTEM_MANAGEMENT: true,
  },
  [Role.CORPORATE_OWNER]: {
    DASHBOARD: true,
    WORK_ORDERS: true,
    PROPERTIES: true,
    FINANCE: true,
    HR: true,
    ADMINISTRATION: true,
    CRM: true,
    MARKETPLACE: true,
    SUPPORT: true,
    COMPLIANCE: true,
    REPORTS: true,
    SYSTEM_MANAGEMENT: true,
  },
  [Role.TEAM_MEMBER]: {
    DASHBOARD: true,
    WORK_ORDERS: true,
    PROPERTIES: false,
    FINANCE: false,
    HR: false,
    ADMINISTRATION: false,
    CRM: true,
    MARKETPLACE: false,
    SUPPORT: true,
    COMPLIANCE: false,
    REPORTS: true,
    SYSTEM_MANAGEMENT: false,
  },
  [Role.TECHNICIAN]: {
    DASHBOARD: true,
    WORK_ORDERS: true,
    PROPERTIES: false,
    FINANCE: false,
    HR: false,
    ADMINISTRATION: false,
    CRM: false,
    MARKETPLACE: false,
    SUPPORT: true,
    COMPLIANCE: false,
    REPORTS: true,
    SYSTEM_MANAGEMENT: false,
  },
  [Role.PROPERTY_MANAGER]: {
    DASHBOARD: true,
    WORK_ORDERS: true,
    PROPERTIES: true,
    FINANCE: false,
    HR: false,
    ADMINISTRATION: false,
    CRM: false,
    MARKETPLACE: false,
    SUPPORT: true,
    COMPLIANCE: false,
    REPORTS: true,
    SYSTEM_MANAGEMENT: false,
  },
  [Role.TENANT]: {
    DASHBOARD: true,
    WORK_ORDERS: true,
    PROPERTIES: true,
    FINANCE: false,
    HR: false,
    ADMINISTRATION: false,
    CRM: false,
    MARKETPLACE: true,
    SUPPORT: true,
    COMPLIANCE: false,
    REPORTS: true,
    SYSTEM_MANAGEMENT: false,
  },
  [Role.VENDOR]: {
    DASHBOARD: true,
    WORK_ORDERS: true,
    PROPERTIES: false,
    FINANCE: false,
    HR: false,
    ADMINISTRATION: false,
    CRM: false,
    MARKETPLACE: true,
    SUPPORT: true,
    COMPLIANCE: false,
    REPORTS: true,
    SYSTEM_MANAGEMENT: false,
  },
  [Role.GUEST]: {
    DASHBOARD: true,
    WORK_ORDERS: false,
    PROPERTIES: false,
    FINANCE: false,
    HR: false,
    ADMINISTRATION: false,
    CRM: false,
    MARKETPLACE: false,
    SUPPORT: false,
    COMPLIANCE: false,
    REPORTS: false,
    SYSTEM_MANAGEMENT: false,
  },
};

/* =========================
 * 6) Role → Submodule → Actions
 * ========================= */

export const TECHNICIAN_ASSIGNED_ACTIONS: Action[] = [
  "start_work",
  "pause_work",
  "complete_work",
  "submit_estimate",
  "attach_quote",
];

type ActionsBySubmodule = Partial<Record<SubmoduleKey, Action[]>>;

export const ROLE_ACTIONS: Record<Role, ActionsBySubmodule> = {
  [Role.SUPER_ADMIN]: {
    // Work Orders
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: ["view", "assign", "schedule", "dispatch", "update", "export", "share", "request_approval", "approve", "post_finance"],
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
    WO_TRACK_ASSIGN: ["view", "assign", "schedule", "dispatch", "update", "export", "share", "request_approval", "approve", "post_finance"],
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
    WO_TRACK_ASSIGN: ["view", "update", ...TECHNICIAN_ASSIGNED_ACTIONS, "upload_media"],
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
    WO_TRACK_ASSIGN: ["view", "assign", "schedule", "dispatch", "update", "export", "share", "approve"],
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
    WO_TRACK_ASSIGN: ["view", "submit_estimate", "attach_quote", "upload_media", "complete_work"],
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

/* =========================
 * Sub-Role Action Extensions
 * STRICT v4.1: Team members require sub-role for specialized access.
 * ========================= */

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

/**
 * STRICT v4.1: Submodules that require specific sub-roles for TEAM_MEMBER access.
 * TEAM_MEMBER without the required sub-role cannot access these specialized domains.
 */
export const SUBMODULE_REQUIRED_SUBROLE: Partial<Record<SubmoduleKey, SubRole[]>> = {
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

/* =========================
 * 7) Resource Context
 * ========================= */

export type ResourceCtx = {
  orgId: string;
  propertyId?: string;
  unitId?: string;
  createdBy?: string;
  ownerUserId?: string;
  technicianUserId?: string;
  requesterUserId?: string;
  plan: Plan;
  role: Role;
  subRole?: SubRole;
  userId: string;
  isOrgMember: boolean;
  isSuperAdmin?: boolean;
  isOwnerOfProperty?: boolean;
  isTechnicianAssigned?: boolean;
  uploadedMedia?: Array<"BEFORE" | "DURING" | "AFTER" | "QUOTE">;
  vendorId?: string;
  assignedProperties?: string[];
  units?: string[];
  agentId?: string;
  assumedUserId?: string;
};

/* =========================
 * 8) RBAC Functions
 * ========================= */

/**
 * STRICT v4.1: Compute allowed modules based on role and sub-role
 * Used for dynamic module access (e.g., Team Member specializations)
 * PARITY: Must match fm.behavior.ts computeAllowedModules exactly
 */
export function computeAllowedModules(role: Role, subRole?: SubRole): ModuleKey[] {
  // Get base modules from ROLE_MODULE_ACCESS
  const baseModules = ROLE_MODULE_ACCESS[role];
  const allowed: ModuleKey[] = [];

  for (const [module, hasAccess] of Object.entries(baseModules || {})) {
    if (hasAccess) {
      allowed.push(module as ModuleKey);
    }
  }

  // STRICT v4.1: Merge sub-role modules with base TEAM_MEMBER modules (union, not override)
  if (role === Role.TEAM_MEMBER && subRole) {
    const subRoleModules: ModuleKey[] = [];
    switch (subRole) {
      case SubRole.FINANCE_OFFICER:
        // Add Finance module to base TEAM_MEMBER modules
        subRoleModules.push(ModuleKey.FINANCE);
        break;

      case SubRole.HR_OFFICER:
        // Add HR module to base TEAM_MEMBER modules (+ PII access via separate check)
        subRoleModules.push(ModuleKey.HR);
        break;

      case SubRole.SUPPORT_AGENT:
        // Add Support module to base TEAM_MEMBER modules
        subRoleModules.push(ModuleKey.SUPPORT);
        break;

      case SubRole.OPERATIONS_MANAGER:
        // Add Work Orders and Properties to base TEAM_MEMBER modules
        subRoleModules.push(ModuleKey.WORK_ORDERS, ModuleKey.PROPERTIES);
        break;

      default:
        // Base Team Member access
        break;
    }
    // Merge base + sub-role modules (union)
    return [...new Set([...allowed, ...subRoleModules])];
  }

  return allowed;
}

export function canAccessModule(module: ModuleKey, _action: string, ctx: ResourceCtx): boolean {
  if (ctx.role === Role.SUPER_ADMIN) return true;

  const allowedModules = computeAllowedModules(ctx.role, ctx.subRole);
  const hasModuleAccess = allowedModules.includes(module);
  if (!hasModuleAccess) return false;

  if (!ctx.isOrgMember) return false;

  return true;
}

export function can(
  submodule: SubmoduleKey | ModuleKey,
  action: Action,
  ctx: ResourceCtx
): boolean {
  // PARITY: Must match fm.behavior.ts - fallback to userId when requesterUserId is not set
  const requesterId = ctx.requesterUserId ?? ctx.userId;

  if (Object.values(ModuleKey).includes(submodule as ModuleKey)) {
    return canAccessModule(submodule as ModuleKey, action, ctx);
  }

  // 1) Plan gate
  if (!PLAN_GATES[ctx.plan]?.[submodule as SubmoduleKey]) return false;

  // 2) STRICT v4.1: Sub-role enforcement for TEAM_MEMBER
  if (ctx.role === Role.TEAM_MEMBER) {
    // Check sub-role actions first (extends base TEAM_MEMBER permissions)
    if (ctx.subRole && SUB_ROLE_ACTIONS[ctx.subRole]?.[submodule as SubmoduleKey]?.includes(action)) {
      // Sub-role grants this action - continue to scope checks below
    } else {
      // Check if this submodule requires a specific sub-role for TEAM_MEMBER access
      const requiredSubRoles = SUBMODULE_REQUIRED_SUBROLE[submodule as SubmoduleKey];
      if (requiredSubRoles && requiredSubRoles.length > 0) {
        // Submodule requires a sub-role that the user doesn't have
        if (!ctx.subRole || !requiredSubRoles.includes(ctx.subRole)) {
          return false;
        }
      }
      // Fall back to base TEAM_MEMBER permissions
      const baseAllowed = ROLE_ACTIONS[ctx.role]?.[submodule as SubmoduleKey];
      if (!baseAllowed?.includes(action)) return false;
    }
  } else {
    // 2b) Role action allow-list (non-TEAM_MEMBER roles)
    const allowed = ROLE_ACTIONS[ctx.role]?.[submodule as SubmoduleKey];
    if (!allowed?.includes(action)) return false;
  }

  // 3) Org membership check (Super Admin bypasses)
  if (!ctx.isOrgMember && ctx.role !== Role.SUPER_ADMIN) return false;

  // TENANT scope validation: must own the user record OR unit membership
  if (ctx.role === Role.TENANT) {
    // Create action: validate unit membership + requester ownership
    if (action === "create") {
      if (ctx.unitId && ctx.units && !ctx.units.includes(ctx.unitId)) {
        return false;
      }
      return requesterId === ctx.userId;
    }
    // Other actions: validate unit access + requester ownership
    if (ctx.unitId && ctx.units?.length) {
      const hasUnitAccess = ctx.units.includes(ctx.unitId);
      if (!hasUnitAccess && !ctx.isSuperAdmin) {
        return false;
      }
    }
    return requesterId === ctx.userId;
  }

  // CORPORATE_OWNER scope validation: must own/manage the property
  if (ctx.role === Role.CORPORATE_OWNER && ctx.propertyId) {
    const ownsProperty =
      ctx.isOwnerOfProperty ||
      (ctx.assignedProperties && ctx.assignedProperties.includes(ctx.propertyId));
    if (!ownsProperty && !ctx.isSuperAdmin) {
      return false;
    }
  }

  // PROPERTY_MANAGER scope validation: must be assigned to the property
  if (ctx.role === Role.PROPERTY_MANAGER && ctx.propertyId) {
    const managesProperty =
      ctx.assignedProperties && ctx.assignedProperties.includes(ctx.propertyId);
    if (!managesProperty && !ctx.isSuperAdmin) {
      return false;
    }
  }

  if (ctx.role === Role.TECHNICIAN && TECHNICIAN_ASSIGNED_ACTIONS.includes(action)) {
    return !!ctx.isTechnicianAssigned;
  }

  return true;
}
