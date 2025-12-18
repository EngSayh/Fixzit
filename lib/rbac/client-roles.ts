/**
 * Client-safe RBAC definitions (generated).
 * Source of truth: types/user.ts (UserRole, TEAM_MEMBER_SUB_ROLES).
 * Do NOT import server-only modules into client bundles.
 */
import { Plan, SubmoduleKey, PLAN_GATES, ROLE_ALIAS_MAP, ROLE_MODULE_ACCESS, ROLE_ACTIONS, SUB_ROLE_ACTIONS, inferSubRoleFromRole as inferSubRoleFromRoleV4 } from "@/domain/fm/fm.types";

export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  CORPORATE_ADMIN = "CORPORATE_ADMIN",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  FM_MANAGER = "FM_MANAGER",
  PROPERTY_MANAGER = "PROPERTY_MANAGER",
  TECHNICIAN = "TECHNICIAN",
  FINANCE = "FINANCE",
  HR = "HR",
  PROCUREMENT = "PROCUREMENT",
  TEAM_MEMBER = "TEAM_MEMBER",
  SOUQ_ADMIN = "SOUQ_ADMIN",
  MARKETPLACE_MODERATOR = "MARKETPLACE_MODERATOR",
  OWNER = "OWNER",
  TENANT = "TENANT",
  VENDOR = "VENDOR",
  AUDITOR = "AUDITOR",
  CORPORATE_OWNER = "CORPORATE_OWNER",
  EMPLOYEE = "EMPLOYEE",
  SUPPORT = "SUPPORT",
  DISPATCHER = "DISPATCHER",
  FINANCE_MANAGER = "FINANCE_MANAGER",
  CUSTOMER = "CUSTOMER",
  VIEWER = "VIEWER",
  GUEST = "GUEST",
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

const FULL_ACCESS = Object.values(ModuleKey);

// Default module access per role and sub-role
const ROLE_MODULES: Record<Role | SubRole, ModuleKey[]> = {
  [Role.SUPER_ADMIN]: FULL_ACCESS,
  [Role.CORPORATE_ADMIN]: FULL_ACCESS,
  [Role.ADMIN]: FULL_ACCESS,
  [Role.MANAGER]: FULL_ACCESS,
  [Role.FM_MANAGER]: [ModuleKey.DASHBOARD, ModuleKey.WORK_ORDERS, ModuleKey.PROPERTIES, ModuleKey.REPORTS],
  [Role.PROPERTY_MANAGER]: [ModuleKey.DASHBOARD, ModuleKey.WORK_ORDERS, ModuleKey.PROPERTIES, ModuleKey.SUPPORT, ModuleKey.REPORTS],
  [Role.TECHNICIAN]: [ModuleKey.DASHBOARD, ModuleKey.WORK_ORDERS, ModuleKey.SUPPORT, ModuleKey.REPORTS],
  [Role.FINANCE]: [ModuleKey.DASHBOARD, ModuleKey.FINANCE, ModuleKey.REPORTS],
  [Role.HR]: [ModuleKey.DASHBOARD, ModuleKey.HR, ModuleKey.REPORTS],
  [Role.PROCUREMENT]: [ModuleKey.DASHBOARD, ModuleKey.MARKETPLACE, ModuleKey.SUPPORT, ModuleKey.REPORTS],
  [Role.TEAM_MEMBER]: [ModuleKey.DASHBOARD, ModuleKey.WORK_ORDERS, ModuleKey.CRM, ModuleKey.SUPPORT, ModuleKey.REPORTS],
  [Role.SOUQ_ADMIN]: [ModuleKey.DASHBOARD],
  [Role.MARKETPLACE_MODERATOR]: [ModuleKey.DASHBOARD],
  [Role.OWNER]: [ModuleKey.DASHBOARD, ModuleKey.PROPERTIES, ModuleKey.FINANCE, ModuleKey.REPORTS],
  [Role.TENANT]: [ModuleKey.DASHBOARD, ModuleKey.WORK_ORDERS, ModuleKey.PROPERTIES, ModuleKey.MARKETPLACE, ModuleKey.SUPPORT, ModuleKey.REPORTS],
  [Role.VENDOR]: [ModuleKey.DASHBOARD, ModuleKey.WORK_ORDERS, ModuleKey.MARKETPLACE, ModuleKey.SUPPORT, ModuleKey.REPORTS],
  [Role.AUDITOR]: [ModuleKey.DASHBOARD, ModuleKey.REPORTS],
  [Role.CORPORATE_OWNER]: FULL_ACCESS,
  [Role.EMPLOYEE]: [ModuleKey.DASHBOARD, ModuleKey.WORK_ORDERS, ModuleKey.SUPPORT],
  [Role.SUPPORT]: [ModuleKey.DASHBOARD, ModuleKey.SUPPORT, ModuleKey.CRM, ModuleKey.REPORTS],
  [Role.DISPATCHER]: [ModuleKey.DASHBOARD, ModuleKey.WORK_ORDERS, ModuleKey.SUPPORT],
  [Role.FINANCE_MANAGER]: [ModuleKey.DASHBOARD, ModuleKey.FINANCE, ModuleKey.REPORTS],
  [Role.CUSTOMER]: [ModuleKey.DASHBOARD, ModuleKey.MARKETPLACE, ModuleKey.SUPPORT],
  [Role.VIEWER]: [ModuleKey.DASHBOARD, ModuleKey.REPORTS],
  [Role.GUEST]: [ModuleKey.DASHBOARD],
  [SubRole.FINANCE_OFFICER]: [ModuleKey.DASHBOARD, ModuleKey.FINANCE, ModuleKey.REPORTS],
  [SubRole.HR_OFFICER]: [ModuleKey.DASHBOARD, ModuleKey.HR, ModuleKey.REPORTS],
  [SubRole.SUPPORT_AGENT]: [ModuleKey.DASHBOARD, ModuleKey.SUPPORT, ModuleKey.CRM, ModuleKey.REPORTS],
  [SubRole.OPERATIONS_MANAGER]: [ModuleKey.DASHBOARD, ModuleKey.WORK_ORDERS, ModuleKey.PROPERTIES, ModuleKey.SUPPORT, ModuleKey.REPORTS],
} as const;

// Legacy/alias map (must stay in sync with server normalization rules)
const ALIAS_MAP: Record<string, Role> = {
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
  role?: string | null,
  expectedSubRole?: string | null,
  strict = false,
): Role | null {
  if (!role) return null;
  const key = role.toUpperCase();
  const normalized = ALIAS_MAP[key] ?? (Role as Record<string, Role>)[key] ?? null;
  if (strict && normalized === Role.TEAM_MEMBER && !expectedSubRole) {
    throw new Error(
      `STRICT v4.1 violation: Role "${role}" maps to TEAM_MEMBER but requires a subRole to be specified`,
    );
  }
  return normalized as Role | null;
}

export function normalizeSubRole(subRole?: string | null): SubRole | null {
  if (!subRole) return null;
  const key = subRole.toUpperCase();
  return (SubRole as Record<string, SubRole>)[key] ?? null;
}

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
      return inferSubRoleFromRoleV4(role as string | null) ?? undefined;
  }
}

export function computeAllowedModules(
  role: Role | string,
  subRole?: SubRole | string | null,
): ModuleKey[] {
  const normalizedRole = normalizeRole(role) ?? Role.VIEWER;
  const normalizedSubRole = normalizeSubRole(subRole);

  const baseModules = ROLE_MODULES[normalizedRole] ?? [ModuleKey.DASHBOARD];
  if (normalizedSubRole && ROLE_MODULES[normalizedSubRole as SubRole]) {
    const subModules = ROLE_MODULES[normalizedSubRole as SubRole] ?? [];
    return [...new Set([...baseModules, ...subModules])];
  }

  return baseModules as ModuleKey[];
}

export { Plan, SubmoduleKey, PLAN_GATES, ROLE_ALIAS_MAP, ROLE_MODULE_ACCESS, ROLE_ACTIONS, SUB_ROLE_ACTIONS };
