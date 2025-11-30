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
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: ["view", "assign", "schedule", "dispatch", "update", "export", "share", "post_finance"],
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
    WO_TRACK_ASSIGN: ["view", "assign", "schedule", "dispatch", "update", "export", "share", "post_finance"],
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
    WO_TRACK_ASSIGN: ["view", "assign", "schedule", "dispatch", "update"],
    WO_PM: ["view", "create", "update"],
    WO_SERVICE_HISTORY: ["view"],
    PROP_LIST: ["view"],
    PROP_UNITS_TENANTS: ["view"],
    PROP_LEASES: ["view"],
    PROP_INSPECTIONS: ["view"],
    PROP_DOCUMENTS: ["view"],
  },
  [Role.TECHNICIAN]: {
    WO_CREATE: ["view", "comment"],
    WO_TRACK_ASSIGN: ["view", "submit_estimate", "attach_quote", "upload_media", "start_work", "pause_work", "complete_work"],
    WO_PM: ["view"],
    WO_SERVICE_HISTORY: ["view"],
  },
  [Role.PROPERTY_MANAGER]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: ["view", "assign", "schedule", "update"],
    WO_PM: ["view", "create", "update"],
    WO_SERVICE_HISTORY: ["view", "export"],
    PROP_LIST: ["view", "update"],
    PROP_UNITS_TENANTS: ["view", "update"],
    PROP_LEASES: ["view", "update"],
    PROP_INSPECTIONS: ["view", "create", "update"],
    PROP_DOCUMENTS: ["view", "create", "update"],
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
    WO_TRACK_ASSIGN: ["view", "submit_estimate", "attach_quote", "upload_media", "complete_work"],
    WO_PM: ["view"],
    WO_SERVICE_HISTORY: ["view"],
  },
  [Role.GUEST]: {},
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

export function computeAllowedModules(role: Role, subRole?: SubRole): ModuleKey[] {
  const baseModules = ROLE_MODULE_ACCESS[role];
  const allowed: ModuleKey[] = [];

  for (const [module, hasAccess] of Object.entries(baseModules || {})) {
    if (hasAccess) {
      allowed.push(module as ModuleKey);
    }
  }

  if (role === Role.TEAM_MEMBER && subRole) {
    switch (subRole) {
      case SubRole.FINANCE_OFFICER:
        return [ModuleKey.DASHBOARD, ModuleKey.FINANCE, ModuleKey.REPORTS];
      case SubRole.HR_OFFICER:
        return [ModuleKey.DASHBOARD, ModuleKey.HR, ModuleKey.REPORTS];
      case SubRole.SUPPORT_AGENT:
        return [ModuleKey.DASHBOARD, ModuleKey.SUPPORT, ModuleKey.CRM, ModuleKey.REPORTS];
      case SubRole.OPERATIONS_MANAGER:
        return [ModuleKey.DASHBOARD, ModuleKey.WORK_ORDERS, ModuleKey.PROPERTIES, ModuleKey.SUPPORT, ModuleKey.REPORTS];
      default:
        break;
    }
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
  if (Object.values(ModuleKey).includes(submodule as ModuleKey)) {
    return canAccessModule(submodule as ModuleKey, action, ctx);
  }

  if (!PLAN_GATES[ctx.plan]?.[submodule as SubmoduleKey]) return false;

  const allowed = ROLE_ACTIONS[ctx.role]?.[submodule as SubmoduleKey];
  if (!allowed?.includes(action)) return false;

  if (!ctx.isOrgMember && ctx.role !== Role.SUPER_ADMIN) return false;

  if (ctx.role === Role.TENANT && action !== "create") {
    return ctx.requesterUserId === ctx.userId;
  }

  if (ctx.role === Role.CORPORATE_OWNER || ctx.role === Role.PROPERTY_MANAGER) {
    if (ctx.propertyId && !(ctx.isOwnerOfProperty || ctx.isSuperAdmin)) {
      return false;
    }
  }

  if (ctx.role === Role.TECHNICIAN && TECHNICIAN_ASSIGNED_ACTIONS.includes(action)) {
    return !!ctx.isTechnicianAssigned;
  }

  return true;
}
