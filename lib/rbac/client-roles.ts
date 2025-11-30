/**
 * Client-safe RBAC definitions (generated).
 * Source of truth: types/user.ts (UserRole, TEAM_MEMBER_SUB_ROLES).
 * Do NOT import server-only modules into client bundles.
 */

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

  // Additional roles for backwards compatibility
  CORPORATE_ADMIN = "CORPORATE_ADMIN",
  MANAGER = "MANAGER",
  FM_MANAGER = "FM_MANAGER",
  FINANCE = "FINANCE",
  HR = "HR",
  PROCUREMENT = "PROCUREMENT",
  OWNER = "OWNER",
  AUDITOR = "AUDITOR",
  CUSTOMER = "CUSTOMER",
  VIEWER = "VIEWER",
  EMPLOYEE = "EMPLOYEE",
  SUPPORT = "SUPPORT",
  DISPATCHER = "DISPATCHER",
  FINANCE_MANAGER = "FINANCE_MANAGER",
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

const FULL_ACCESS = Object.values(ModuleKey);

// Default module access per role and sub-role
const ROLE_MODULES: Partial<Record<Role | SubRole, ModuleKey[]>> = {
  [Role.SUPER_ADMIN]: FULL_ACCESS,
  [Role.CORPORATE_ADMIN]: FULL_ACCESS,
  [Role.ADMIN]: FULL_ACCESS,
  [Role.MANAGER]: FULL_ACCESS,
  [Role.FM_MANAGER]: [ModuleKey.DASHBOARD, ModuleKey.WORK_ORDERS, ModuleKey.PROPERTIES, ModuleKey.REPORTS],
  [Role.PROPERTY_MANAGER]: [ModuleKey.DASHBOARD, ModuleKey.WORK_ORDERS, ModuleKey.PROPERTIES, ModuleKey.REPORTS],
  [Role.TECHNICIAN]: [ModuleKey.DASHBOARD, ModuleKey.WORK_ORDERS, ModuleKey.SUPPORT, ModuleKey.REPORTS],
  [Role.FINANCE]: [ModuleKey.DASHBOARD, ModuleKey.FINANCE, ModuleKey.REPORTS],
  [Role.HR]: [ModuleKey.DASHBOARD, ModuleKey.HR, ModuleKey.REPORTS],
  [Role.PROCUREMENT]: [ModuleKey.DASHBOARD, ModuleKey.MARKETPLACE, ModuleKey.SUPPORT, ModuleKey.REPORTS],
  [Role.OWNER]: [ModuleKey.DASHBOARD, ModuleKey.PROPERTIES, ModuleKey.FINANCE, ModuleKey.REPORTS],
  [Role.TENANT]: [ModuleKey.DASHBOARD, ModuleKey.WORK_ORDERS, ModuleKey.PROPERTIES, ModuleKey.MARKETPLACE, ModuleKey.SUPPORT, ModuleKey.REPORTS],
  [Role.VENDOR]: [ModuleKey.DASHBOARD, ModuleKey.MARKETPLACE, ModuleKey.SUPPORT],
  [Role.AUDITOR]: [ModuleKey.DASHBOARD, ModuleKey.REPORTS],
  [Role.CUSTOMER]: [ModuleKey.DASHBOARD, ModuleKey.MARKETPLACE, ModuleKey.SUPPORT],
  [Role.VIEWER]: [ModuleKey.DASHBOARD, ModuleKey.REPORTS],
  [Role.CORPORATE_OWNER]: FULL_ACCESS,
  [Role.EMPLOYEE]: [ModuleKey.DASHBOARD, ModuleKey.WORK_ORDERS, ModuleKey.SUPPORT],
  [Role.SUPPORT]: [ModuleKey.DASHBOARD, ModuleKey.SUPPORT, ModuleKey.CRM, ModuleKey.REPORTS],
  [Role.DISPATCHER]: [ModuleKey.DASHBOARD, ModuleKey.WORK_ORDERS, ModuleKey.SUPPORT],
  [Role.FINANCE_MANAGER]: [ModuleKey.DASHBOARD, ModuleKey.FINANCE, ModuleKey.REPORTS],
  [Role.TEAM_MEMBER]: [ModuleKey.DASHBOARD, ModuleKey.WORK_ORDERS, ModuleKey.CRM, ModuleKey.SUPPORT, ModuleKey.REPORTS],
  [Role.GUEST]: [ModuleKey.DASHBOARD],
  [SubRole.FINANCE_OFFICER]: [ModuleKey.DASHBOARD, ModuleKey.FINANCE, ModuleKey.REPORTS],
  [SubRole.HR_OFFICER]: [ModuleKey.DASHBOARD, ModuleKey.HR, ModuleKey.REPORTS],
  [SubRole.SUPPORT_AGENT]: [ModuleKey.DASHBOARD, ModuleKey.SUPPORT, ModuleKey.CRM, ModuleKey.REPORTS],
  [SubRole.OPERATIONS_MANAGER]: [ModuleKey.DASHBOARD, ModuleKey.WORK_ORDERS, ModuleKey.PROPERTIES, ModuleKey.SUPPORT, ModuleKey.REPORTS],
} as const;

// Legacy/alias map (must stay in sync with server normalization rules)
const ALIAS_MAP: Record<string, Role> = {
  TENANT_ADMIN: Role.ADMIN,
  CLIENT_ADMIN: Role.ADMIN,
  MANAGEMENT: Role.MANAGER,
  FM_MANAGER: Role.FM_MANAGER,
  FINANCE: Role.FINANCE,
  HR: Role.HR,
  PROCUREMENT: Role.PROCUREMENT,
  EMPLOYEE: Role.EMPLOYEE,
  DISPATCHER: Role.DISPATCHER,
  SUPPORT: Role.SUPPORT,
  AUDITOR: Role.AUDITOR,
  VIEWER: Role.VIEWER,
  FIELD_ENGINEER: Role.TECHNICIAN,
  INTERNAL_TECHNICIAN: Role.TECHNICIAN,
  CONTRACTOR_TECHNICIAN: Role.TECHNICIAN,
  MARKETPLACE_PARTNER: Role.VENDOR,
  SERVICE_PROVIDER: Role.VENDOR,
  SUPPLIER: Role.VENDOR,
  PROPERTY_OWNER: Role.CORPORATE_OWNER,
  OWNER: Role.CORPORATE_OWNER,
};

export function normalizeRole(role?: string | null): Role | null {
  if (!role) return null;
  const key = role.toUpperCase();
  return ALIAS_MAP[key] ?? (Role as Record<string, Role>)[key] ?? null;
}

export function normalizeSubRole(subRole?: string | null): SubRole | null {
  if (!subRole) return null;
  const key = subRole.toUpperCase();
  return (SubRole as Record<string, SubRole>)[key] ?? null;
}

export function computeAllowedModules(
  role: Role | string,
  subRole?: SubRole | string | null,
): ModuleKey[] {
  const normalizedRole = normalizeRole(role) ?? Role.VIEWER;
  const normalizedSubRole = normalizeSubRole(subRole);

  if (normalizedSubRole && ROLE_MODULES[normalizedSubRole as SubRole]) {
    return ROLE_MODULES[normalizedSubRole as SubRole];
  }

  return ROLE_MODULES[normalizedRole] ?? [ModuleKey.DASHBOARD];
}

/* =========================
 * Plan Gates
 * ========================= */

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
