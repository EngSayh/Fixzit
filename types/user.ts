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
  
  // PHASE-3 FIX: Specialized Sub-Roles (Team Member specializations)
  // These provide granular access to Finance/HR/Support modules
  FINANCE_OFFICER: "FINANCE_OFFICER", // Finance module only + reports
  HR_OFFICER: "HR_OFFICER", // HR module + PII access + reports
  SUPPORT_AGENT: "SUPPORT_AGENT", // Support + CRM + reports
  OPERATIONS_MANAGER: "OPERATIONS_MANAGER", // Wider scope: WO + Properties + Support
  
  // Property & External Roles (4)
  OWNER: "OWNER",
  TENANT: "TENANT",
  VENDOR: "VENDOR",
  AUDITOR: "AUDITOR",
  
  // Legacy roles deprecated in STRICT v4 - kept for backward compatibility
  // TODO: Migrate all usages to the 14-role matrix above
  EMPLOYEE: "EMPLOYEE", // Deprecated - replace with MANAGER or specific function role
  CUSTOMER: "CUSTOMER", // Deprecated - replace with TENANT or OWNER
  VIEWER: "VIEWER", // Deprecated - replace with AUDITOR
  DISPATCHER: "DISPATCHER", // Deprecated - replace with FM_MANAGER or PROPERTY_MANAGER
  SUPPORT: "SUPPORT", // Deprecated - replace with ADMIN or MANAGER
  FINANCE_MANAGER: "FINANCE_MANAGER", // Deprecated - replace with FINANCE or FINANCE_OFFICER
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// Array of all valid roles for validation
export const ALL_ROLES = Object.values(UserRole);

// 🔒 STRICT v4: Role categories for the 14-role matrix
export const ADMIN_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.CORPORATE_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
] as const;

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

export const PROPERTY_ROLES = [
  UserRole.OWNER,
  UserRole.TENANT,
] as const;

export const EXTERNAL_ROLES = [
  UserRole.VENDOR,
  UserRole.AUDITOR,
] as const;

/**
 * User status values
 */
export const UserStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
  PENDING: "PENDING",
} as const;

export type UserStatusType = (typeof UserStatus)[keyof typeof UserStatus];
