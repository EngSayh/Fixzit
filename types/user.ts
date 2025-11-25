/**
 * Central User Role definitions for Fixzit platform
 * Single source of truth for all user roles across the application
 */

export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  CORPORATE_ADMIN: "CORPORATE_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  FM_MANAGER: "FM_MANAGER",
  PROPERTY_MANAGER: "PROPERTY_MANAGER",
  FINANCE: "FINANCE",
  HR: "HR",
  PROCUREMENT: "PROCUREMENT",
  TECHNICIAN: "TECHNICIAN",
  EMPLOYEE: "EMPLOYEE",
  OWNER: "OWNER",
  TENANT: "TENANT",
  VENDOR: "VENDOR",
  CUSTOMER: "CUSTOMER",
  AUDITOR: "AUDITOR",
  VIEWER: "VIEWER",
  DISPATCHER: "DISPATCHER", // For FM dispatch operations
  SUPPORT: "SUPPORT", // For support ticket management
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// Array of all valid roles for validation
export const ALL_ROLES = Object.values(UserRole);

// Role categories for grouping
export const ADMIN_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.CORPORATE_ADMIN,
  UserRole.ADMIN,
] as const;
export const FM_ROLES = [
  UserRole.MANAGER,
  UserRole.FM_MANAGER,
  UserRole.PROPERTY_MANAGER,
  UserRole.DISPATCHER,
  UserRole.TECHNICIAN,
] as const;
export const BUSINESS_ROLES = [
  UserRole.FINANCE,
  UserRole.HR,
  UserRole.PROCUREMENT,
] as const;
export const EXTERNAL_ROLES = [UserRole.VENDOR, UserRole.CUSTOMER] as const;
export const PROPERTY_ROLES = [UserRole.OWNER, UserRole.TENANT] as const;

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
