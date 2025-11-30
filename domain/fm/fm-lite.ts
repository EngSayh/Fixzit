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
 */
export const PLAN_GATES: Record<Plan, Partial<Record<SubmoduleKey, boolean>>> = {
  [Plan.STARTER]: {
    WO_CREATE: true,
    WO_TRACK_ASSIGN: true,
    WO_PM: false,
    WO_SERVICE_HISTORY: true,
    PROP_LIST: true,
    PROP_UNITS_TENANTS: true,
    PROP_LEASES: false,
    PROP_INSPECTIONS: false,
    PROP_DOCUMENTS: true,
  },
  [Plan.STANDARD]: {
    WO_CREATE: true,
    WO_TRACK_ASSIGN: true,
    WO_PM: true,
    WO_SERVICE_HISTORY: true,
    PROP_LIST: true,
    PROP_UNITS_TENANTS: true,
    PROP_LEASES: true,
    PROP_INSPECTIONS: true,
    PROP_DOCUMENTS: true,
  },
  [Plan.PRO]: {
    WO_CREATE: true,
    WO_TRACK_ASSIGN: true,
    WO_PM: true,
    WO_SERVICE_HISTORY: true,
    PROP_LIST: true,
    PROP_UNITS_TENANTS: true,
    PROP_LEASES: true,
    PROP_INSPECTIONS: true,
    PROP_DOCUMENTS: true,
  },
  [Plan.ENTERPRISE]: {
    WO_CREATE: true,
    WO_TRACK_ASSIGN: true,
    WO_PM: true,
    WO_SERVICE_HISTORY: true,
    PROP_LIST: true,
    PROP_UNITS_TENANTS: true,
    PROP_LEASES: true,
    PROP_INSPECTIONS: true,
    PROP_DOCUMENTS: true,
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
 */
export const ROLE_ACTIONS: Record<Role, ActionsBySubmodule> = {
  [Role.SUPER_ADMIN]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: [
      "view", "assign", "schedule", "dispatch", "update", "export",
      "share", "request_approval", "approve", "post_finance",
    ],
    WO_PM: ["view", "create", "update", "export"],
    WO_SERVICE_HISTORY: ["view", "export"],
    PROP_LIST: ["view", "create", "update", "delete", "export"],
    PROP_UNITS_TENANTS: ["view", "update", "export"],
    PROP_LEASES: ["view", "create", "update", "export"],
    PROP_INSPECTIONS: ["view", "create", "update", "export"],
    PROP_DOCUMENTS: ["view", "create", "update", "export"],
  },
  [Role.ADMIN]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: [
      "view", "assign", "schedule", "dispatch", "update", "export",
      "share", "request_approval", "approve", "post_finance",
    ],
    WO_PM: ["view", "create", "update", "export"],
    WO_SERVICE_HISTORY: ["view", "export"],
    PROP_LIST: ["view", "create", "update", "delete", "export"],
    PROP_UNITS_TENANTS: ["view", "update", "export"],
    PROP_LEASES: ["view", "create", "update", "export"],
    PROP_INSPECTIONS: ["view", "create", "update", "export"],
    PROP_DOCUMENTS: ["view", "create", "update", "export"],
  },
  [Role.CORPORATE_OWNER]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: ["view", "approve", "reject", "request_changes", "export"],
    WO_PM: ["view"],
    WO_SERVICE_HISTORY: ["view", "export"],
    PROP_LIST: ["view", "create", "update", "export"],
    PROP_UNITS_TENANTS: ["view", "update", "export"],
    PROP_LEASES: ["view", "create", "update", "export"],
    PROP_INSPECTIONS: ["view", "create", "update", "export"],
    PROP_DOCUMENTS: ["view", "create", "update", "export"],
  },
  [Role.TEAM_MEMBER]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: [
      "view", "assign", "update", "export", "post_finance",
      "request_approval", "approve",
    ],
    WO_PM: ["view", "create", "update", "export"],
  },
  [Role.TECHNICIAN]: {
    WO_CREATE: ["view", "comment"],
    WO_TRACK_ASSIGN: [
      "view", "update", ...TECHNICIAN_ASSIGNED_ACTIONS, "upload_media",
    ],
    WO_PM: ["view", "update"],
    WO_SERVICE_HISTORY: ["view"],
  },
  [Role.PROPERTY_MANAGER]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: [
      "view", "assign", "schedule", "dispatch", "update",
      "export", "share", "approve",
    ],
    WO_PM: ["view", "export"],
    WO_SERVICE_HISTORY: ["view", "export"],
    PROP_LIST: ["view", "update", "export"],
    PROP_UNITS_TENANTS: ["view", "update", "export"],
    PROP_LEASES: ["view", "export"],
    PROP_INSPECTIONS: ["view", "create", "update", "export"],
    PROP_DOCUMENTS: ["view", "create", "update", "export"],
  },
  [Role.TENANT]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: ["view", "comment"],
    WO_PM: ["view"],
    WO_SERVICE_HISTORY: ["view"],
    PROP_LIST: ["view"],
    PROP_UNITS_TENANTS: ["view"],
  },
  [Role.VENDOR]: {
    WO_CREATE: ["view", "comment"],
    WO_TRACK_ASSIGN: [
      "view", "submit_estimate", "attach_quote", "upload_media", "complete_work",
    ],
    WO_PM: ["view"],
    WO_SERVICE_HISTORY: ["view"],
  },
  [Role.GUEST]: {},
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
 * Client-safe permission check function.
 * Simplified version of can() for UI rendering decisions.
 */
export function canClient(
  submodule: SubmoduleKey,
  action: Action,
  ctx: ClientResourceCtx,
): boolean {
  // 1) Plan gate
  if (!PLAN_GATES[ctx.plan]?.[submodule]) return false;

  // 2) Role action allow-list
  const allowed = ROLE_ACTIONS[ctx.role]?.[submodule];
  if (!allowed?.includes(action)) return false;

  // 3) Basic org membership check (Super Admin bypasses)
  if (!ctx.isOrgMember && ctx.role !== Role.SUPER_ADMIN) return false;

  // 4) Technician assignment check for specific actions
  if (
    ctx.role === Role.TECHNICIAN &&
    TECHNICIAN_ASSIGNED_ACTIONS.includes(action)
  ) {
    return !!ctx.isTechnicianAssigned;
  }

  return true;
}
