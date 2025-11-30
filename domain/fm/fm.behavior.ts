/* domain/fm/fm.behavior.ts
 * Fixzit Facility Management: unified behaviors for Cursor + Mongo (Mongoose)
 * 
 * STRICT v4.1 COMPLIANT - Governance V5/V6 Aligned
 * 
 * This file implements the canonical RBAC matrix from STRICT v4.1 specification,
 * fully aligned with Master System Governance V5 and Sidebar Specs V6.
 * 
 * Key Components:
 * - 9 Canonical Roles (Super Admin, Admin, Corporate Owner, Team Member, 
 *   Technician, Property Manager, Tenant, Vendor, Guest)
 * - 12 Modules (Dashboard, Work Orders, Properties, Finance, HR, Administration,
 *   CRM, Marketplace, Support, Compliance & Legal, Reports & Analytics, System Management)
 * - Complete Role→Module→Action access matrix
 * - ABAC guards with org-scoping and ownership checks
 * - Data scope rules (org_id, property_id, vendor_id, unit_id filters)
 * - PII protection for sensitive HR/identity data
 * - Team Member sub-roles (Finance Officer, HR Officer, Support Agent, Operations Manager)
 * - AI Agent governance (assumed identity, audit logging)
 * - Work Order state machine with FSM transitions
 * - Approvals DSL with delegation and escalation

import { logger } from "@/lib/logger";
 * - SLA policies and notification rules
 * - Mongoose schemas for MongoDB persistence
 * 
 * Role Scope Distinction (v4.1):
 * - SUPER_ADMIN: Cross-org access (isSuperAdmin: true, no org_id filter, all actions audited)
 * - ADMIN: Org-scoped full access (isSuperAdmin: false, { org_id: user.org_id })
 * - CORPORATE_OWNER: Org-scoped, may have property_owner_id filter
 * - TEAM_MEMBER: Org-scoped + sub-role specialization (Finance/HR/Support/Operations)
 * - TECHNICIAN: { org_id: user.org_id, assigned_to_user_id: user._id }
 * - PROPERTY_MANAGER: { org_id: user.org_id, property_id: { $in: user.assigned_properties } }
 * - TENANT: { org_id: user.org_id, unit_id: { $in: user.units } }
 * - VENDOR: { vendor_id: user.vendor_id }
 * - GUEST: Public data only ({ is_public: true })
 * 
 * PII Rules (v4.1):
 * - Sensitive data (national ID, salary, disciplinary records) restricted to:
 *   Super Admin, Admin, HR Officer, Compliance roles
 * - Identity documents stored encrypted, accessed via explicit PII permission
 * 
 * AI Agent Rules (v4.1):
 * - Agents act on behalf of a user (assumed_user_id)
 * - Inherit user's role and data scope, no RBAC bypass
 * - All agent actions logged with agent_id + assumed_user_id
 * 
 * Legacy aliases maintained for backward compatibility but deprecated.
 * Use canonical role names in new code.
 */

import mongoose, { Schema, Types } from "mongoose";
import { logger } from "@/lib/logger";

/* =========================
 * 1) Enums & Constants
 * ========================= */

export enum Role {
  // STRICT v4.1 Canonical Roles
  SUPER_ADMIN = "SUPER_ADMIN", // Platform operator, cross-org access, all actions audited
  ADMIN = "ADMIN", // Tenant admin, org-scoped full access
  CORPORATE_OWNER = "CORPORATE_OWNER", // Portfolio owner, org-scoped + property filters
  TEAM_MEMBER = "TEAM_MEMBER", // Corporate staff/employee, operational role (use SubRole for specialization)
  TECHNICIAN = "TECHNICIAN", // Field worker, assigned WOs only
  PROPERTY_MANAGER = "PROPERTY_MANAGER", // Manages subset of properties
  TENANT = "TENANT", // End-user, own units only
  VENDOR = "VENDOR", // External service provider
  GUEST = "GUEST", // Public visitor, no auth
  
  // Legacy aliases for backward compatibility (deprecated, use canonical names above)
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values -- Intentional: backward compatibility alias
  CORPORATE_ADMIN = "ADMIN", /** @deprecated Use ADMIN instead */
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values -- Intentional: backward compatibility alias
  MANAGEMENT = "TEAM_MEMBER", /** @deprecated Use TEAM_MEMBER with module restrictions instead */
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values -- Intentional: backward compatibility alias
  FINANCE = "TEAM_MEMBER", /** @deprecated Use TEAM_MEMBER with Finance module access instead */
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values -- Intentional: backward compatibility alias
  HR = "TEAM_MEMBER", /** @deprecated Use TEAM_MEMBER with HR module access instead */
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values -- Intentional: backward compatibility alias
  EMPLOYEE = "TEAM_MEMBER", /** @deprecated Use TEAM_MEMBER instead */
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values -- Intentional: backward compatibility alias
  PROPERTY_OWNER = "CORPORATE_OWNER", /** @deprecated Use CORPORATE_OWNER instead */
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values -- Intentional: backward compatibility alias
  OWNER_DEPUTY = "PROPERTY_MANAGER", /** @deprecated Role removed in STRICT v4 */
}

export enum Plan {
  STARTER = "STARTER",
  STANDARD = "STANDARD",
  PRO = "PRO",
  ENTERPRISE = "ENTERPRISE",
}

/** STRICT v4.1: Team Member sub-roles for functional specialization */
export enum SubRole {
  FINANCE_OFFICER = "FINANCE_OFFICER", // Finance module access
  HR_OFFICER = "HR_OFFICER", // HR module + PII access
  SUPPORT_AGENT = "SUPPORT_AGENT", // Support + CRM access
  OPERATIONS_MANAGER = "OPERATIONS_MANAGER", // Wider scope, higher DoA
}

/** FM modules (STRICT v4 - matches Governance V5/V6 tabs) */
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
  COMPLIANCE = "COMPLIANCE", // Compliance & Legal
  REPORTS = "REPORTS", // Reports & Analytics
  SYSTEM_MANAGEMENT = "SYSTEM_MANAGEMENT",
}

export enum SubmoduleKey {
  // Work Orders
  WO_CREATE = "WO_CREATE",
  WO_TRACK_ASSIGN = "WO_TRACK_ASSIGN",
  WO_PM = "WO_PM", // Preventive Maintenance
  WO_SERVICE_HISTORY = "WO_SERVICE_HISTORY",
  // Properties
  PROP_LIST = "PROP_LIST",
  PROP_UNITS_TENANTS = "PROP_UNITS_TENANTS",
  PROP_LEASES = "PROP_LEASES",
  PROP_INSPECTIONS = "PROP_INSPECTIONS",
  PROP_DOCUMENTS = "PROP_DOCUMENTS",
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

/** SLA priorities (policy values are configurable per org) */
export const SLA = {
  P1: { responseMins: 30, resolutionHours: 6 },
  P2: { responseMins: 120, resolutionHours: 24 },
  P3: { responseMins: 480, resolutionHours: 72 },
} as const;

/** Default plan gates (tweak to match your pricing) */
export const PLAN_GATES: Record<
  Plan,
  Partial<Record<SubmoduleKey, boolean>>
> = {
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
 * 2) Role Normalization (Legacy Aliases)
 * ========================= */

/** Mapping of legacy role names to STRICT v4.1 canonical roles */
export const ROLE_ALIAS_MAP: Record<string, Role> = {
  // STRICT v4.1 Canonical Roles (identity mapping)
  SUPER_ADMIN: Role.SUPER_ADMIN,
  ADMIN: Role.ADMIN,
  CORPORATE_OWNER: Role.CORPORATE_OWNER,
  TEAM_MEMBER: Role.TEAM_MEMBER,
  TECHNICIAN: Role.TECHNICIAN,
  PROPERTY_MANAGER: Role.PROPERTY_MANAGER,
  TENANT: Role.TENANT,
  VENDOR: Role.VENDOR,
  GUEST: Role.GUEST,
  
  // Legacy aliases (backward compatibility)
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

/**
 * Normalizes a role string (legacy or canonical) to a STRICT v4.1 canonical Role enum value.
 * Returns null if the role is not recognized.
 * 
 * @example
 * normalizeRole("CORPORATE_ADMIN") // Role.ADMIN
 * normalizeRole("EMPLOYEE") // Role.TEAM_MEMBER
 * normalizeRole("ADMIN") // Role.ADMIN
 */
export function normalizeRole(role?: string | Role | null): Role | null {
  if (!role) return null;
  if (typeof role !== 'string') return role; // Already a Role enum
  const key = role.toUpperCase();
  return ROLE_ALIAS_MAP[key] ?? (Role as Record<string, string>)[key] as Role ?? null;
}

/**
 * Normalizes a sub-role string to a STRICT v4.1 canonical SubRole enum value.
 * Returns null if the sub-role is not recognized.
 * 
 * @param subRole - The sub-role string to normalize
 * @example
 * normalizeSubRole("FINANCE_OFFICER") // SubRole.FINANCE_OFFICER
 * normalizeSubRole("finance_officer") // SubRole.FINANCE_OFFICER
 * normalizeSubRole("INVALID") // null
 */
export function normalizeSubRole(subRole?: string | SubRole | null): SubRole | null {
  if (!subRole) return null;
  if (typeof subRole !== 'string') return subRole; // Already a SubRole enum
  const key = subRole.toUpperCase();
  return (SubRole as Record<string, string>)[key] as SubRole ?? null;
}

/**
 * Infers a default SubRole from a legacy role string.
 * Used when migrating from old role system where role implied function.
 * 
 * @param role - The role string to infer sub-role from
 * @example
 * inferSubRoleFromRole("FINANCE") // SubRole.FINANCE_OFFICER
 * inferSubRoleFromRole("HR") // SubRole.HR_OFFICER
 * inferSubRoleFromRole("SUPPORT") // SubRole.SUPPORT_AGENT
 * inferSubRoleFromRole("ADMIN") // null (no inference for admin roles)
 */
export function inferSubRoleFromRole(role?: string | null): SubRole | null {
  if (!role) return null;
  const key = role.toUpperCase();
  
  // Direct mappings from legacy functional roles to sub-roles
  const ROLE_TO_SUBROLE: Record<string, SubRole> = {
    FINANCE: SubRole.FINANCE_OFFICER,
    FINANCE_MANAGER: SubRole.FINANCE_OFFICER,
    FINANCE_OFFICER: SubRole.FINANCE_OFFICER,
    HR: SubRole.HR_OFFICER,
    HR_OFFICER: SubRole.HR_OFFICER,
    SUPPORT: SubRole.SUPPORT_AGENT,
    SUPPORT_AGENT: SubRole.SUPPORT_AGENT,
    OPERATIONS: SubRole.OPERATIONS_MANAGER,
    OPERATIONS_MANAGER: SubRole.OPERATIONS_MANAGER,
    FM_MANAGER: SubRole.OPERATIONS_MANAGER,
  };
  
  return ROLE_TO_SUBROLE[key] ?? null;
}

/* =========================
 * 3) Role → Module access (STRICT v4 Matrix)
 * ========================= */

export const ROLE_MODULE_ACCESS: Record<
  Role,
  Partial<Record<ModuleKey, boolean>>
> = {
  // Super Admin: Full access to ALL modules, cross-org (isSuperAdmin: true)
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
  
  // Admin (Tenant Admin / Corporate Admin): Full access within their org (isSuperAdmin: false)
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
  
  // Corporate Owner: Full module access but may have DoA restrictions on dangerous actions
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
    SYSTEM_MANAGEMENT: true, // Can be restricted via DoA for risky config
  },
  
  // Team Member: Operational staff (Dashboard, Work Orders, CRM, Support, Reports only)
  // STRICT v4.1: Use SubRole for specialization (Finance Officer, HR Officer, Support Agent, Operations Manager)
  [Role.TEAM_MEMBER]: {
    DASHBOARD: true,
    WORK_ORDERS: true,
    PROPERTIES: false,
    FINANCE: false, // Finance Officer (SubRole) gets this
    HR: false, // HR Officer (SubRole) gets this + PII access
    ADMINISTRATION: false,
    CRM: true,
    MARKETPLACE: false,
    SUPPORT: true,
    COMPLIANCE: false,
    REPORTS: true,
    SYSTEM_MANAGEMENT: false,
  },
  
  // Technician: Field worker (Dashboard, Work Orders, Support, Reports - personal stats)
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
    REPORTS: true, // Personal performance stats only
    SYSTEM_MANAGEMENT: false,
  },
  
  // Property Manager: Manages property portfolio (Dashboard, Work Orders, Properties, Support, Reports)
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
  
  // Tenant: End-user (Dashboard, Work Orders, Properties - own units, Marketplace, Support, Reports)
  [Role.TENANT]: {
    DASHBOARD: true,
    WORK_ORDERS: true,
    PROPERTIES: true, // Own unit/property only
    FINANCE: false,
    HR: false,
    ADMINISTRATION: false,
    CRM: false,
    MARKETPLACE: true,
    SUPPORT: true,
    COMPLIANCE: false,
    REPORTS: true, // Own history/statements only
    SYSTEM_MANAGEMENT: false,
  },
  
  // Vendor: External service provider (Dashboard, Work Orders - assigned only, Marketplace, Support, Reports)
  [Role.VENDOR]: {
    DASHBOARD: true,
    WORK_ORDERS: true, // Only WOs tied to their vendor account
    PROPERTIES: false,
    FINANCE: false,
    HR: false,
    ADMINISTRATION: false,
    CRM: false,
    MARKETPLACE: true,
    SUPPORT: true,
    COMPLIANCE: false,
    REPORTS: true, // Vendor performance only
    SYSTEM_MANAGEMENT: false,
  },
  
  // Guest: Public visitor (Dashboard - public landing only)
  [Role.GUEST]: {
    DASHBOARD: true, // Public landing/dashboard only
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
 * 4) Role × Submodule → Actions (RBAC core)
 * ========================= */
/** Actions that only assigned technicians can perform */
export const TECHNICIAN_ASSIGNED_ACTIONS: Action[] = [
  "start_work",
  "pause_work",
  "complete_work",
  "submit_estimate",
  "attach_quote",
];

type ActionsBySubmodule = Partial<Record<SubmoduleKey, Action[]>>;
export const ROLE_ACTIONS: Record<Role, ActionsBySubmodule> = {
  // Super Admin: Full actions on all submodules (cross-org access via isSuperAdmin: true)
  [Role.SUPER_ADMIN]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: [
      "view",
      "assign",
      "schedule",
      "dispatch",
      "update",
      "export",
      "share",
      "post_finance",
    ],
    WO_PM: ["view", "create", "update", "export"],
    WO_SERVICE_HISTORY: ["view", "export"],
    PROP_LIST: ["view", "create", "update", "delete", "export"],
    PROP_UNITS_TENANTS: ["view", "update", "export"],
    PROP_LEASES: ["view", "create", "update", "export"],
    PROP_INSPECTIONS: ["view", "create", "update", "export"],
    PROP_DOCUMENTS: ["view", "create", "update", "export"],
  },
  
  // Admin: Full actions within their org (org-scoped via isSuperAdmin: false)
  [Role.ADMIN]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: [
      "view",
      "assign",
      "schedule",
      "dispatch",
      "update",
      "export",
      "share",
      "post_finance",
    ],
    WO_PM: ["view", "create", "update", "export"],
    WO_SERVICE_HISTORY: ["view", "export"],
    PROP_LIST: ["view", "create", "update", "delete", "export"],
    PROP_UNITS_TENANTS: ["view", "update", "export"],
    PROP_LEASES: ["view", "create", "update", "export"],
    PROP_INSPECTIONS: ["view", "create", "update", "export"],
    PROP_DOCUMENTS: ["view", "create", "update", "export"],
  },
  
  // Corporate Owner: Portfolio management with approval authority
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
  
  // Team Member: Operational staff, create and manage WOs
  [Role.TEAM_MEMBER]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: ["view", "assign", "update", "export", "post_finance"],
    WO_PM: ["view", "create", "update", "export"],
  },
  
  // Technician: Field worker, assigned WOs only
  [Role.TECHNICIAN]: {
    WO_CREATE: ["view", "comment"],
    WO_TRACK_ASSIGN: [
      "view",
      "update",
      ...TECHNICIAN_ASSIGNED_ACTIONS,
      "upload_media",
    ],
    WO_PM: ["view", "update"],
    WO_SERVICE_HISTORY: ["view"],
  },
  
  // Property Manager: Manages properties and related WOs
  [Role.PROPERTY_MANAGER]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: [
      "view",
      "assign",
      "schedule",
      "dispatch",
      "update",
      "export",
      "share",
    ],
    WO_PM: ["view", "export"],
    WO_SERVICE_HISTORY: ["view", "export"],
    PROP_LIST: ["view", "update", "export"],
    PROP_UNITS_TENANTS: ["view", "update", "export"],
    PROP_LEASES: ["view", "export"],
    PROP_INSPECTIONS: ["view", "create", "update", "export"],
    PROP_DOCUMENTS: ["view", "create", "update", "export"],
  },
  
  // Tenant: End-user, own units only
  [Role.TENANT]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: ["view", "comment"],
    WO_PM: ["view"],
    WO_SERVICE_HISTORY: ["view"],
    PROP_LIST: ["view"],
    PROP_UNITS_TENANTS: ["view"],
  },
  
  // Vendor: External service provider
  [Role.VENDOR]: {
    WO_CREATE: ["view", "comment"],
    WO_TRACK_ASSIGN: [
      "view",
      "submit_estimate",
      "attach_quote",
      "upload_media",
      "complete_work",
    ],
    WO_PM: ["view"],
    WO_SERVICE_HISTORY: ["view"],
  },
  
  // Guest: No actions
  [Role.GUEST]: {},
};

/* =========================
 * 5) AI Agent Governance (STRICT v4.1)
 * ========================= */

/**
 * STRICT v4.1: AI Agent audit log entry
 * All agent actions must be logged with assumed user identity
 */
export type AgentAuditLog = {
  agent_id: string; // Agent identifier (e.g., "cursor", "qodo", "copilot")
  assumed_user_id: string; // User the agent is acting on behalf of
  timestamp?: Date;
  action_summary: string; // Human-readable action description
  resource_type: string; // e.g., "WorkOrder", "Property", "User"
  resource_id?: string;
  org_id: string; // Org context
  request_path?: string; // API endpoint or file path
  success: boolean;
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
};

/**
 * STRICT v4.1: Log agent action for audit trail
 * Agents inherit user's role/scope but all actions are tracked
 */
export async function logAgentAction(log: AgentAuditLog): Promise<void> {
  if (!log.agent_id || !log.assumed_user_id || !log.org_id) {
    logger.error("[AGENT_AUDIT_ERROR] Missing required audit fields", {
      agent_id: log.agent_id,
      assumed_user_id: log.assumed_user_id,
      org_id: log.org_id,
    });
    return;
  }

  const timestamp = log.timestamp ?? new Date();

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    logger.debug(
      "[AGENT_AUDIT]",
      JSON.stringify({ ...log, timestamp }, null, 2),
    );
  }
  
  // Persistent MongoDB audit logging (STRICT v4.1)
  try {
    // Dynamic import to avoid circular dependencies
    const { AgentAuditLog: AgentAuditLogModel } = await import("@/server/models/AgentAuditLog");
    
    await AgentAuditLogModel.create({
      agent_id: log.agent_id,
      assumed_user_id: log.assumed_user_id,
      timestamp,
      action_summary: log.action_summary,
      resource_type: log.resource_type,
      resource_id: log.resource_id,
      org_id: log.org_id,
      request_path: log.request_path,
      success: log.success,
      error_message: log.error_message,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      session_id: log.session_id,
    });
  } catch (error) {
    // Don't throw - audit logging failure shouldn't break the operation
    logger.error("[AGENT_AUDIT_ERROR] Failed to persist agent action:", error);
  }
}

/**
 * STRICT v4.1: Validate agent has permission to act on behalf of user
 * Agents MUST assume a user identity and inherit their RBAC
 */
export function validateAgentAccess(ctx: ResourceCtx): boolean {
  if (!ctx.agentId) {
    return true; // Not an agent request, normal validation applies
  }

  // Agent must have assumed_user_id
  if (!ctx.assumedUserId) {
    logger.error("[AGENT_ERROR] Agent missing assumed_user_id", {
      agent_id: ctx.agentId,
    });
    return false;
  }

  // Agent cannot bypass RBAC - they inherit user's permissions
  // This is enforced by using assumedUserId to load the user's role/scope
  return true;
}

/* =========================
 * 6) Module-Level Access Check
 * ========================= */

/**
 * Check if a role has access to a specific module (module-level permission check).
 * This is simpler than the full ABAC `can()` which checks submodule + action + context.
 * 
 * @param module - The module to check
 * @param action - The action being attempted (view, create, etc.)
 * @param ctx - Resource context with role, plan, org membership
 * @returns true if the role can access the module
 */
export function canAccessModule(
  module: ModuleKey,
  action: string,
  ctx: ResourceCtx,
): boolean {
  // Super Admin bypasses all checks
  if (ctx.role === Role.SUPER_ADMIN) return true;
  
  // Use computed modules so Team Member sub-roles are honored
  const allowedModules = computeAllowedModules(ctx.role, ctx.subRole);
  const hasModuleAccess = allowedModules.includes(module);
  if (!hasModuleAccess) return false;
  
  // Org membership required for non-Super Admin roles
  if (!ctx.isOrgMember) return false;
  
  return true;
}

/* =========================
 * 7) ABAC Guard (scope + plan + ownership)
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
  subRole?: SubRole; // STRICT v4.1: Team Member specialization
  userId: string;
  isOrgMember: boolean;
  isSuperAdmin?: boolean;
  isOwnerOfProperty?: boolean;
  isTechnicianAssigned?: boolean;
  uploadedMedia?: Array<"BEFORE" | "DURING" | "AFTER" | "QUOTE">;
  vendorId?: string; // STRICT v4.1: Vendor scoping
  assignedProperties?: string[]; // STRICT v4.1: Property Manager scope
  units?: string[]; // STRICT v4.1: Tenant scope
  agentId?: string; // STRICT v4.1: AI Agent governance
  assumedUserId?: string; // STRICT v4.1: Agent acting on behalf of user
};

/** STRICT v4.1: Data scope filter generator for MongoDB queries */
export type DataScopeFilter = {
  org_id?: string;
  property_id?: { $in: string[] } | string;
  unit_id?: { $in: string[] };
  assigned_to_user_id?: string;
  vendor_id?: string;
  tenant_id?: string;
  is_public?: boolean;
};

/**
 * STRICT v4.1: Compute allowed modules based on role and sub-role
 * Used for dynamic module access (e.g., Team Member specializations)
 */
export function computeAllowedModules(
  role: Role,
  subRole?: SubRole,
): ModuleKey[] {
  // Get base modules from ROLE_MODULE_ACCESS
  const baseModules = ROLE_MODULE_ACCESS[role];
  const allowed: ModuleKey[] = [];

  for (const [module, hasAccess] of Object.entries(baseModules || {})) {
    if (hasAccess) {
      allowed.push(module as ModuleKey);
    }
  }

  // STRICT v4.1: Override for Team Member sub-roles
  if (role === Role.TEAM_MEMBER && subRole) {
    switch (subRole) {
      case SubRole.FINANCE_OFFICER:
        // Dashboard, Finance, Reports only
        return [ModuleKey.DASHBOARD, ModuleKey.FINANCE, ModuleKey.REPORTS];

      case SubRole.HR_OFFICER:
        // Dashboard, HR, Reports only (+ PII access via separate check)
        return [ModuleKey.DASHBOARD, ModuleKey.HR, ModuleKey.REPORTS];

      case SubRole.SUPPORT_AGENT:
        // Dashboard, Support, CRM, Reports
        return [
          ModuleKey.DASHBOARD,
          ModuleKey.SUPPORT,
          ModuleKey.CRM,
          ModuleKey.REPORTS,
        ];

      case SubRole.OPERATIONS_MANAGER:
        // Dashboard, Work Orders, Properties, Support, Reports (wider scope)
        return [
          ModuleKey.DASHBOARD,
          ModuleKey.WORK_ORDERS,
          ModuleKey.PROPERTIES,
          ModuleKey.SUPPORT,
          ModuleKey.REPORTS,
        ];

      default:
        // Base Team Member access
        break;
    }
  }

  return allowed;
}

/**
 * STRICT v4.1: Check if user has PII access (sensitive HR/identity data)
 * Restricted to: Super Admin, Admin, HR Officer, Compliance roles
 */
export function hasPIIAccess(role: Role, subRole?: SubRole): boolean {
  if (role === Role.SUPER_ADMIN || role === Role.ADMIN) {
    return true;
  }

  if (role === Role.TEAM_MEMBER && subRole === SubRole.HR_OFFICER) {
    return true;
  }

  // Compliance/Legal roles under Administration also get PII access
  // This would be checked via additional permission flags in practice
  return false;
}

/**
 * STRICT v4.1: Generate MongoDB filter for role-based data scoping
 * Enforces tenant isolation and row-level security
 */
export function buildDataScopeFilter(ctx: ResourceCtx): DataScopeFilter {
  const filter: DataScopeFilter = {};

  // Super Admin: no org filter (cross-org access, but must be audited)
  if (ctx.role === Role.SUPER_ADMIN) {
    // Platform-wide access, return empty filter
    // Note: All Super Admin queries must be logged separately
    return filter;
  }

  // All other roles: enforce org isolation
  filter.org_id = ctx.orgId;

  // Role-specific additional filters
  switch (ctx.role) {
    case Role.ADMIN:
    case Role.CORPORATE_OWNER:
      // Full tenant scope (org_id already set)
      // Corporate Owner may have additional property_owner_id filter in practice
      break;

    case Role.TECHNICIAN:
      // Only assigned work orders
      filter.assigned_to_user_id = ctx.userId;
      break;

    case Role.PROPERTY_MANAGER:
      // Only assigned properties
      if (ctx.assignedProperties && ctx.assignedProperties.length > 0) {
        filter.property_id = { $in: ctx.assignedProperties };
      }
      break;

    case Role.TENANT:
      // Only own units
      if (ctx.units && ctx.units.length > 0) {
        filter.unit_id = { $in: ctx.units };
      }
      filter.tenant_id = ctx.userId;
      break;

    case Role.VENDOR:
      // Only vendor-assigned work orders/orders
      if (ctx.vendorId) {
        filter.vendor_id = ctx.vendorId;
      }
      break;

    case Role.TEAM_MEMBER:
      // Org-scoped, may add functional filters based on subRole
      // Finance Officer, HR Officer, etc. - handled in module-level checks
      break;

    case Role.GUEST:
      // Public data only
      filter.is_public = true;
      break;

    default:
      // Deny access by default for unknown roles
      filter.org_id = "00000000-invalid-role";
  }

  return filter;
}

export function can(
  submodule: SubmoduleKey | ModuleKey,
  action: Action,
  ctx: ResourceCtx,
): boolean {
  // If checking module-level access (not a submodule), use canAccessModule
  if (Object.values(ModuleKey).includes(submodule as ModuleKey)) {
    return canAccessModule(submodule as ModuleKey, action, ctx);
  }
  
  // 1) Plan gate
  if (!PLAN_GATES[ctx.plan]?.[submodule as SubmoduleKey]) return false;

  // 2) Role action allow-list
  const allowed = ROLE_ACTIONS[ctx.role]?.[submodule as SubmoduleKey];
  if (!allowed?.includes(action)) return false;

  // 3) Ownership / scope checks (row-level security)
  // Super Admin bypasses org checks (cross-org access)
  if (!ctx.isOrgMember && ctx.role !== Role.SUPER_ADMIN) return false;

  // Tenant: strict ownership - can only access own units/WOs
  if (ctx.role === Role.TENANT && action !== "create") {
    return ctx.requesterUserId === ctx.userId;
  }

  // Corporate Owner / Property Manager: must own/manage the property
  if (
    ctx.role === Role.CORPORATE_OWNER ||
    ctx.role === Role.PROPERTY_MANAGER
  ) {
    if (ctx.propertyId && !(ctx.isOwnerOfProperty || ctx.isSuperAdmin)) {
      return false;
    }
  }

  // Technician: certain actions require assignment
  if (
    ctx.role === Role.TECHNICIAN &&
    TECHNICIAN_ASSIGNED_ACTIONS.includes(action)
  ) {
    return !!ctx.isTechnicianAssigned;
  }

  return true;
}

/* =========================
 * 8) Work Order State Machine (FSM)
 * ========================= */

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

/** FSM transition definition with optional RBAC action enforcement */
type TransitionDef = {
  from: string;
  to: string;
  by: Role[];
  action?: Action;
  requireMedia?: Array<"BEFORE" | "AFTER">;
  guard?: "technicianAssigned";
  optional?: boolean;
};

export const WORK_ORDER_FSM: {
  requiredMediaByStatus: Partial<
    Record<string, ReadonlyArray<"BEFORE" | "AFTER">>
  >;
  transitions: TransitionDef[];
  sla: typeof SLA;
} = {
  requiredMediaByStatus: {
    ASSESSMENT: ["BEFORE"],
    WORK_COMPLETE: ["AFTER"],
  },
  transitions: [
    {
      from: "NEW",
      to: "ASSESSMENT",
      by: [Role.EMPLOYEE, Role.CORPORATE_ADMIN, Role.MANAGEMENT, Role.HR],
    },
    {
      from: "ASSESSMENT",
      to: "ESTIMATE_PENDING",
      by: [Role.TECHNICIAN],
      requireMedia: ["BEFORE"],
    },
    {
      from: "ESTIMATE_PENDING",
      to: "QUOTATION_REVIEW",
      by: [Role.TECHNICIAN],
      action: "attach_quote",
    },
    {
      from: "QUOTATION_REVIEW",
      to: "PENDING_APPROVAL",
      by: [Role.EMPLOYEE, Role.CORPORATE_ADMIN],
      action: "request_approval",
    },
    {
      from: "PENDING_APPROVAL",
      to: "APPROVED",
      by: [
        Role.PROPERTY_OWNER,
        Role.OWNER_DEPUTY,
        Role.MANAGEMENT,
        Role.FINANCE,
      ],
      action: "approve",
    },
    {
      from: "APPROVED",
      to: "IN_PROGRESS",
      by: [Role.TECHNICIAN],
      action: "start_work",
    },
    {
      from: "IN_PROGRESS",
      to: "WORK_COMPLETE",
      by: [Role.TECHNICIAN],
      action: "complete_work",
      requireMedia: ["AFTER"],
    },
    {
      from: "WORK_COMPLETE",
      to: "QUALITY_CHECK",
      by: [Role.MANAGEMENT, Role.PROPERTY_OWNER],
      optional: true,
    },
    {
      from: "QUALITY_CHECK",
      to: "FINANCIAL_POSTING",
      by: [Role.EMPLOYEE, Role.CORPORATE_ADMIN],
    },
    {
      from: "WORK_COMPLETE",
      to: "FINANCIAL_POSTING",
      by: [Role.EMPLOYEE, Role.CORPORATE_ADMIN],
    },
    {
      from: "FINANCIAL_POSTING",
      to: "CLOSED",
      by: [Role.EMPLOYEE, Role.CORPORATE_ADMIN],
      action: "post_finance",
    },
  ],
  sla: SLA,
};

/* =========================
 * 9) Approvals DSL (Delegation, Escalation, Parallel/Sequential)
 * ========================= */

export type ApprovalRule = {
  name: string;
  when: {
    category?: string[];
    amountGte?: number;
    propertyOwnerRequired?: boolean;
  };
  require: Array<{ role: Role; count?: number }>;
  parallelWith?: Array<{ role: Role; count?: number }>;
  timeoutHours?: number;
  escalateTo?: Role[];
  delegateTo?: Role[];
};

export const APPROVAL_POLICIES: ApprovalRule[] = [
  {
    name: "Default < 1,000",
    when: { amountGte: 0 },
    require: [{ role: Role.PROPERTY_OWNER, count: 1 }],
    timeoutHours: 24,
    escalateTo: [Role.OWNER_DEPUTY, Role.MANAGEMENT],
    delegateTo: [Role.OWNER_DEPUTY],
  },
  {
    name: "Mid 1,000–10,000 HVAC/Plumbing",
    when: {
      amountGte: 1000,
      category: ["HVAC", "Plumbing"],
      propertyOwnerRequired: true,
    },
    require: [
      { role: Role.PROPERTY_OWNER, count: 1 },
      { role: Role.MANAGEMENT, count: 1 },
    ],
    timeoutHours: 24,
    escalateTo: [Role.CORPORATE_ADMIN],
    delegateTo: [Role.OWNER_DEPUTY],
  },
  {
    name: "High ≥ 10,000 Any",
    when: { amountGte: 10000 },
    require: [
      { role: Role.PROPERTY_OWNER, count: 1 },
      { role: Role.MANAGEMENT, count: 1 },
    ],
    parallelWith: [{ role: Role.FINANCE, count: 1 }],
    timeoutHours: 24,
    escalateTo: [Role.CORPORATE_ADMIN],
    delegateTo: [Role.OWNER_DEPUTY],
  },
];

/* =========================
 * 10) Notifications & Deep-links
 * ========================= */

export const NOTIFY = {
  onTicketCreated: ["TENANT", "TECHNICIAN", "EMPLOYEE"],
  onAssign: ["TECHNICIAN"],
  onApprovalRequested: [
    "PROPERTY_OWNER",
    "OWNER_DEPUTY",
    "MANAGEMENT",
    "FINANCE",
  ],
  onApproved: ["TECHNICIAN", "TENANT"],
  onClosed: ["TENANT", "PROPERTY_OWNER"],
  channels: ["push", "email", "sms", "whatsapp"],
  deepLinks: {
    approval: "fixzit://approvals/quote/:quotationId",
    ownerStatement: "fixzit://financials/statements/property/:propertyId",
  },
};

/* =========================
 * 11) Mongoose Schemas (Mongo) - STRICT v4.1 with Indexes
 * ========================= */

/**
 * STRICT v4.1: Recommended MongoDB Indexes for Performance
 * 
 * Work Orders Collection:
 * - { org_id: 1, status: 1 } - Tenant-scoped status queries
 * - { org_id: 1, assigned_to_user_id: 1 } - Technician assignments
 * - { org_id: 1, property_id: 1 } - Property Manager scope
 * - { org_id: 1, vendor_id: 1 } - Vendor assignments
 * - { org_id: 1, tenant_id: 1 } - Tenant requests
 * 
 * Users Collection:
 * - { org_id: 1, role: 1 } - Role-based user queries
 * - { email: 1 } - Unique login lookup
 * - { org_id: 1, sub_role: 1 } - Team Member specialization queries
 * 
 * Properties Collection:
 * - { org_id: 1 } - Tenant isolation
 * - { org_id: 1, property_owner_id: 1 } - Corporate Owner scope
 * 
 * Units Collection:
 * - { property_id: 1 } - Units by property
 * - { org_id: 1, tenant_id: 1 } - Tenant units
 * 
 * Audit Logs Collection (STRICT v4.1):
 * - { agent_id: 1, timestamp: -1 } - Agent action history
 * - { assumed_user_id: 1, timestamp: -1 } - User activity via agents
 * - { org_id: 1, timestamp: -1 } - Org-level audit trail
 */

const OrganizationSchema = new Schema(
  {
    name: String,
    subscription_plan: {
      type: String,
      enum: Object.values(Plan),
      required: true,
    },
  },
  { timestamps: true },
);

const UserSchema = new Schema(
  {
    name: String,
    email: { type: String, index: true },
    role: { type: String, enum: Object.values(Role), index: true },
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
  },
  { timestamps: true },
);

const PropertySchema = new Schema(
  {
    name: String,
    address: String,
    owner_user_id: { type: Types.ObjectId, ref: "User" },
    deputy_user_id: { type: Types.ObjectId, ref: "User" },
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
  },
  { timestamps: true },
);

const UnitSchema = new Schema(
  {
    unit_number: String,
    property_id: { type: Types.ObjectId, ref: "Property", index: true },
  },
  { timestamps: true },
);

const TenancySchema = new Schema(
  {
    unit_id: { type: Types.ObjectId, ref: "Unit" },
    tenant_user_id: { type: Types.ObjectId, ref: "User" },
    start_date: Date,
    end_date: Date,
  },
  { timestamps: true },
);

const WorkOrderSchema = new Schema(
  {
    title: String,
    description: String,
    priority: { type: String, enum: ["P1", "P2", "P3"], index: true },
    status: { type: String, enum: Object.values(WOStatus), index: true },
    unit_id: { type: Types.ObjectId, ref: "Unit" },
    property_id: { type: Types.ObjectId, ref: "Property", index: true },
    created_by_user_id: { type: Types.ObjectId, ref: "User" },
    technician_user_id: { type: Types.ObjectId, ref: "User" },
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
    chargeable: Boolean,
    estimated_cost: Number,
    actual_cost: Number,
  },
  { timestamps: true },
);

const AttachmentSchema = new Schema(
  {
    work_order_id: { type: Types.ObjectId, ref: "WorkOrder", index: true },
    file_url: String,
    role: { type: String, enum: ["BEFORE", "DURING", "AFTER", "QUOTE"] },
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
  },
  { timestamps: true },
);

const QuotationSchema = new Schema(
  {
    work_order_id: { type: Types.ObjectId, ref: "WorkOrder", index: true },
    amount: Number,
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"] },
    approved_by_user_id: { type: Types.ObjectId, ref: "User" },
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
    line_items: [
      {
        description: String,
        qty: Number,
        price: Number,
        source: { type: String, enum: ["MARKETPLACE", "CUSTOM"] },
      },
    ],
  },
  { timestamps: true },
);

const ApprovalSchema = new Schema(
  {
    quotation_id: { type: Types.ObjectId, ref: "Quotation", index: true },
    approver_user_id: { type: Types.ObjectId, ref: "User" },
    decision: {
      type: String,
      enum: ["APPROVED", "REJECTED", "CHANGES_REQUESTED"],
    },
    comments: String,
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
  },
  { timestamps: true },
);

const FinancialTxnSchema = new Schema(
  {
    amount: Number,
    type: {
      type: String,
      enum: ["INVOICE", "PAYMENT", "EXPENSE", "SUBSCRIPTION_FEE"],
    },
    description: String,
    property_id: { type: Types.ObjectId, ref: "Property", index: true },
    work_order_id: { type: Types.ObjectId, ref: "WorkOrder", index: true },
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
    status: { type: String, enum: ["OPEN", "PAID", "VOID"] },
  },
  { timestamps: true },
);

const PMPlanSchema = new Schema(
  {
    name: String,
    frequency: {
      type: String,
      enum: ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"],
    },
    asset_ids: [{ type: Types.ObjectId }],
    checklist: [String],
    next_run_at: Date,
    responsible_team: [String],
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
  },
  { timestamps: true },
);

const InspectionSchema = new Schema(
  {
    property_id: { type: Types.ObjectId, ref: "Property" },
    unit_id: { type: Types.ObjectId, ref: "Unit" },
    type: String,
    checklist: [{ item: String, severity: String, ok: Boolean }],
    assignee_user_id: { type: Types.ObjectId, ref: "User" },
    signoff: { by: { type: Types.ObjectId, ref: "User" }, at: Date },
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
  },
  { timestamps: true },
);

const DocumentSchema = new Schema(
  {
    title: String,
    doc_type: String,
    version: String,
    effective: Date,
    expiry: Date,
    tags: [String],
    linked: [{ entity: String, id: Types.ObjectId }],
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
  },
  { timestamps: true },
);

export const FMOrganization =
  mongoose.models.FMOrganization ??
  mongoose.model("FMOrganization", OrganizationSchema);
export const FMUser =
  mongoose.models.FMUser ?? mongoose.model("FMUser", UserSchema);
export const FMProperty =
  mongoose.models.FMProperty ?? mongoose.model("FMProperty", PropertySchema);
export const FMUnit =
  mongoose.models.FMUnit ?? mongoose.model("FMUnit", UnitSchema);
export const FMTenancy =
  mongoose.models.FMTenancy ?? mongoose.model("FMTenancy", TenancySchema);
export const FMWorkOrder =
  mongoose.models.FMWorkOrder ?? mongoose.model("FMWorkOrder", WorkOrderSchema);
export const FMAttachment =
  mongoose.models.FMAttachment ??
  mongoose.model("FMAttachment", AttachmentSchema);
export const FMQuotation =
  mongoose.models.FMQuotation ?? mongoose.model("FMQuotation", QuotationSchema);
export const FMApproval =
  mongoose.models.FMApproval ?? mongoose.model("FMApproval", ApprovalSchema);
export const FMFinancialTxn =
  mongoose.models.FMFinancialTxn ??
  mongoose.model("FMFinancialTxn", FinancialTxnSchema);
export const FMPMPlan =
  mongoose.models.FMPMPlan ?? mongoose.model("FMPMPlan", PMPlanSchema);
export const FMInspection =
  mongoose.models.FMInspection ??
  mongoose.model("FMInspection", InspectionSchema);
export const FMDocument =
  mongoose.models.FMDocument ?? mongoose.model("FMDocument", DocumentSchema);

/* =========================
 * 12) Seeds & Smoke Tests
 * ========================= */

export const DEFAULT_APPROVALS = APPROVAL_POLICIES;
export const DEFAULT_SLA = SLA;

/**
 * Smoke test utility for basic RBAC and FSM checks.
 * Intended for development and maintenance validation, not for production use.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Smoke test utility for dev
export function smokeTests() {
  const tenantCtx: ResourceCtx = {
    orgId: "o1",
    plan: Plan.STANDARD,
    role: Role.TENANT,
    userId: "u1",
    isOrgMember: true,
    requesterUserId: "u1",
  };
  // eslint-disable-next-line no-console -- Test assertions
  console.assert(
    can(SubmoduleKey.WO_CREATE, "create", tenantCtx) === true,
    "Tenant can create WO for own unit",
  );
  // eslint-disable-next-line no-console -- Test assertions
  console.assert(
    !can(SubmoduleKey.WO_TRACK_ASSIGN, "approve", tenantCtx),
    "Tenant cannot approve quotes",
  );

  const techCtx: ResourceCtx = {
    orgId: "o1",
    plan: Plan.PRO,
    role: Role.TECHNICIAN,
    userId: "u2",
    isOrgMember: true,
    isTechnicianAssigned: true,
  };
  // eslint-disable-next-line no-console -- Test assertions
  console.assert(
    can(SubmoduleKey.WO_TRACK_ASSIGN, "submit_estimate", techCtx),
    "Tech can submit estimate when assigned",
  );
}

/* =========================
 * 13) Helper: FSM guard example
 * ========================= */

/**
 * Check if required media attachments exist in the work order context
 */
export function hasRequiredMedia(
  ctx: ResourceCtx,
  mediaType: "BEFORE" | "AFTER",
): boolean {
  if (!ctx.uploadedMedia || ctx.uploadedMedia.length === 0) {
    return false;
  }
  return ctx.uploadedMedia.includes(mediaType);
}

/**
 * Validate FSM state transition with media and guard checks.
 * Looks up the transition in WORK_ORDER_FSM and validates it against context.
 * @param from - Starting status
 * @param to - Target status
 * @param actorRole - Role attempting the transition
 * @param ctx - Resource context with media and assignment info
 * @returns true if transition is valid and all guards pass
 */
export function canTransition(
  from: WOStatus,
  to: WOStatus,
  actorRole: Role,
  ctx: ResourceCtx,
): boolean {
  // Find the transition definition
  const transition = WORK_ORDER_FSM.transitions.find(
    (t) =>
      t.from === from && t.to === to && (t.by as Role[]).includes(actorRole),
  );

  if (!transition) return false;

  // Check required media attachments
  if (
    transition.requireMedia?.includes("BEFORE") &&
    !hasRequiredMedia(ctx, "BEFORE")
  )
    return false;
  if (
    transition.requireMedia?.includes("AFTER") &&
    !hasRequiredMedia(ctx, "AFTER")
  )
    return false;

  // Check guard condition for technician assignment
  if (transition.guard === "technicianAssigned" && !ctx.isTechnicianAssigned)
    return false;

  // Enforce RBAC for transition-specific actions
  if (transition.action) {
    if (!can(SubmoduleKey.WO_TRACK_ASSIGN, transition.action, ctx))
      return false;
  }

  return true;
}
