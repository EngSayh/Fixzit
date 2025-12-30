/**
 * Central User Role definitions for Fixzit platform
 * Single source of truth for all user roles across the application
 * 🔒 STRICT v4.1: 14-role matrix with specialized sub-roles (Finance/HR/Support/Ops Officers)
 */

export const UserRole = {
  // Administrative Roles (4)
  SUPER_ADMIN: "SUPER_ADMIN",
  CORPORATE_ADMIN: "CORPORATE_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  
  // Facility Management Roles (3)
  FM_MANAGER: "FM_MANAGER",
  PROPERTY_MANAGER: "PROPERTY_MANAGER",
  TECHNICIAN: "TECHNICIAN",
  
  // Business Function Roles (3) - Base roles
  FINANCE: "FINANCE", // Finance module access
  HR: "HR", // HR module access
  PROCUREMENT: "PROCUREMENT",
  
  // Team Member base role (used for general staff, specializes via sub-roles)
  TEAM_MEMBER: "TEAM_MEMBER", // General staff - use sub-roles for module access
  
  // PHASE-3 FIX: Specialized Sub-Roles (Team Member specializations)
  // These provide granular access to Finance/HR/Support modules
  FINANCE_OFFICER: "FINANCE_OFFICER", // Finance module only + reports
  HR_OFFICER: "HR_OFFICER", // HR module + PII access + reports
  SUPPORT_AGENT: "SUPPORT_AGENT", // Support + CRM + reports
  OPERATIONS_MANAGER: "OPERATIONS_MANAGER", // Wider scope: WO + Properties + Support
  
  // Souq Marketplace Roles (2) - Moderator roles for marketplace
  SOUQ_ADMIN: "SOUQ_ADMIN", // Full Souq admin access
  MARKETPLACE_MODERATOR: "MARKETPLACE_MODERATOR", // Review/listing moderation
  
  // Property & External Roles (4)
  OWNER: "OWNER",
  TENANT: "TENANT",
  VENDOR: "VENDOR",
  AUDITOR: "AUDITOR",
  CORPORATE_OWNER: "CORPORATE_OWNER",
  
  /**
   * @deprecated Legacy roles - DO NOT USE for new code
   * These are kept only for backward compatibility during migration.
   * Use the STRICT v4 14-role matrix above instead.
   *
   * Migration guide:
   * - EMPLOYEE → Use MANAGER or specific function role (HR, FINANCE, etc.)
   * - SUPPORT → Use SUPPORT_AGENT sub-role
   * - DISPATCHER → Use FM_MANAGER or PROPERTY_MANAGER
   * - FINANCE_MANAGER → Use FINANCE or FINANCE_OFFICER
   *
   * These will be removed in a future major release.
   * @see ROLE_ALIAS_MAP in domain/fm/fm-lite.ts for alias resolution
   */
  /** @deprecated Use MANAGER or specific function role instead */
  EMPLOYEE: "EMPLOYEE",
  /** @deprecated Use SUPPORT_AGENT sub-role instead */
  SUPPORT: "SUPPORT",
  /** @deprecated Use FM_MANAGER or PROPERTY_MANAGER instead */
  DISPATCHER: "DISPATCHER",
  /** @deprecated Use FINANCE or FINANCE_OFFICER instead */
  FINANCE_MANAGER: "FINANCE_MANAGER",
  /** @deprecated B2C portal roles - not part of STRICT v4 */
  CUSTOMER: "CUSTOMER",
  /** @deprecated View-only placeholder - not part of STRICT v4 */
  VIEWER: "VIEWER",
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// Canonical STRICT v4 roles (14 base + sub-roles + property/external)
export const CANONICAL_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.CORPORATE_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.FM_MANAGER,
  UserRole.PROPERTY_MANAGER,
  UserRole.TECHNICIAN,
  UserRole.TEAM_MEMBER, // Base role for staff, specializes via sub-roles
  UserRole.FINANCE,
  UserRole.HR,
  UserRole.PROCUREMENT,
  UserRole.FINANCE_OFFICER,
  UserRole.HR_OFFICER,
  UserRole.SUPPORT_AGENT,
  UserRole.OPERATIONS_MANAGER,
  UserRole.SOUQ_ADMIN,
  UserRole.MARKETPLACE_MODERATOR,
  UserRole.OWNER,
  UserRole.TENANT,
  UserRole.VENDOR,
  UserRole.AUDITOR,
  UserRole.CORPORATE_OWNER,
] as const;

// Legacy/Deprecated roles (kept for data migration compatibility only)
export const LEGACY_ROLES = [
  UserRole.EMPLOYEE,
  UserRole.SUPPORT,
  UserRole.DISPATCHER,
  UserRole.FINANCE_MANAGER,
  UserRole.CUSTOMER,
  UserRole.VIEWER,
] as const;

// Preferred arrays for validation
export const ALL_ROLES = CANONICAL_ROLES;
export const ALL_ROLES_WITH_LEGACY = [...CANONICAL_ROLES, ...LEGACY_ROLES] as const;

// 🔒 STRICT v4: Role categories for the 14-role matrix
export const ADMIN_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.CORPORATE_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
] as const;

// 🔐 STRICT v4.1: Roles allowed to moderate content (reviews, posts, claims)
// Centralized definition for consistency across Souq and other modules
export const MODERATOR_ROLES = new Set([
  UserRole.SUPER_ADMIN,
  UserRole.CORPORATE_ADMIN,
  UserRole.ADMIN,
  // Souq-specific moderation roles (can be added when module creates them)
  "SOUQ_ADMIN",
  "MARKETPLACE_MODERATOR",
] as const);

// Helper to validate moderator access
export const isModeratorRole = (role: string | undefined | null): boolean => {
  if (!role) return false;
  return MODERATOR_ROLES.has(role.toUpperCase() as never);
};

export const FM_ROLES = [
  UserRole.FM_MANAGER,
  UserRole.PROPERTY_MANAGER,
  UserRole.TECHNICIAN,
] as const;

export const BUSINESS_ROLES = [
  UserRole.FINANCE, // Finance module access
  UserRole.HR, // HR module access
  UserRole.PROCUREMENT,
] as const;

// PHASE-3 FIX: Specialized Team Member Sub-Roles
// These roles have restricted module access with specialization
export const TEAM_MEMBER_SUB_ROLES = [
  UserRole.FINANCE_OFFICER, // Finance module only
  UserRole.HR_OFFICER, // HR module + PII access
  UserRole.SUPPORT_AGENT, // Support + CRM
  UserRole.OPERATIONS_MANAGER, // Wider operational scope
] as const;

// Helper to check if a role is a specialized sub-role
export const isSubRole = (role: UserRoleType): boolean =>
  (TEAM_MEMBER_SUB_ROLES as readonly string[]).includes(role);

// 🔐 STRICT v4.1: Souq Marketplace Moderator Roles
// Roles allowed to moderate reviews, listings, claims, and ads
export const SOUQ_MODERATOR_ROLES = new Set([
  "SUPER_ADMIN",
  "ADMIN",
  "CORPORATE_ADMIN",
  "SOUQ_ADMIN",
  "MARKETPLACE_MODERATOR",
] as const);

// Helper to check if a role can moderate Souq content
export const isSouqModeratorRole = (role: string | undefined | null): boolean =>
  !!role && SOUQ_MODERATOR_ROLES.has(role.toUpperCase() as typeof SOUQ_MODERATOR_ROLES extends Set<infer T> ? T : never);

export const PROPERTY_ROLES = [
  UserRole.OWNER,
  UserRole.TENANT,
] as const;

export const EXTERNAL_ROLES = [
  UserRole.VENDOR,
  UserRole.AUDITOR,
] as const;

/**
 * @deprecated Legacy roles that should not be used in new code
 * Use ROLE_ALIAS_MAP in domain/fm/fm-lite.ts for mapping these to STRICT v4 roles
 */
export const DEPRECATED_ROLES = [
  UserRole.EMPLOYEE,
  UserRole.SUPPORT,
  UserRole.DISPATCHER,
  UserRole.FINANCE_MANAGER,
  UserRole.CUSTOMER,
  UserRole.VIEWER,
] as const;

/** Helper to check if a role is deprecated and should trigger migration warning */
export const isDeprecatedRole = (role: UserRoleType): boolean =>
  (DEPRECATED_ROLES as readonly string[]).includes(role);

/**
 * User status values
 */
export const UserStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
  PENDING: "PENDING",
  DELETED: "DELETED",
} as const;

export type UserStatusType = (typeof UserStatus)[keyof typeof UserStatus];
