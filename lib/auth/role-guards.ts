/**
 * Role-Based Access Control (RBAC) Guards
 * 
 * Provides role checking utilities for authorization and permission enforcement.
 * Supports role normalization, effective role resolution (with subRole),
 * and boolean guard functions for common permission patterns.
 * 
 * @module lib/auth/role-guards
 * 
 * @example
 * import { hasRole, isAdmin, isSuperAdmin } from '@/lib/auth/role-guards';
 * if (hasRole('ADMIN')(session.user.role)) { ... }
 */
import { UserRole, type UserRoleType } from "@/types/user";
import { normalizeRole as normalizeFmRole } from "@/domain/fm/fm.behavior";

type RoleChecker = (_role?: string | null) => boolean;

const normalizeRole = (role?: string | null): string | null => {
  const canonical = normalizeFmRole(role);
  if (canonical) return canonical;
  return typeof role === "string" ? role.trim().toUpperCase() : null;
};

/**
 * 🔒 STRICT v4.1: Get effective role for permission checks
 * 
 * For users with role: TEAM_MEMBER + subRole: HR_OFFICER/FINANCE_OFFICER/etc,
 * returns the subRole as the effective role for permission checks.
 * 
 * @param role - Primary role from session
 * @param subRole - Sub-role from session (for TEAM_MEMBER specialization)
 * @returns Effective role to use for permission checks
 */
export function getEffectiveRole(
  role?: string | null,
  subRole?: string | null
): string | null {
  // If subRole is set, it takes precedence for permission checks
  // This handles TEAM_MEMBER + HR_OFFICER, TEAM_MEMBER + FINANCE_OFFICER, etc.
  if (subRole) {
    const normalizedSubRole = normalizeRole(subRole);
    if (normalizedSubRole) {
      return normalizedSubRole;
    }
  }
  return normalizeRole(role);
}

/**
 * 🔒 STRICT v4.1: Check if role matches allowed roles (with subRole support)
 * 
 * Checks BOTH the raw role string (uppercased) AND the FM-normalized canonical role.
 * This allows checking for legacy roles like "HR", "FINANCE" which map to TEAM_MEMBER
 * in the FM domain but should still match allowed lists containing "HR", "FINANCE".
 * 
 * @param role - Primary role from session
 * @param subRole - Sub-role from session
 * @param allowedRoles - Array of allowed roles
 * @returns true if role or subRole matches any allowed role
 */
export function hasAllowedRole(
  role?: string | null,
  subRole?: string | null,
  allowedRoles: readonly string[] = []
): boolean {
  const allowedSet = new Set(allowedRoles.map(r => r.toUpperCase()));
  
  // Get both raw uppercased AND FM-normalized versions
  const rawRole = typeof role === "string" ? role.trim().toUpperCase() : null;
  const normalizedRole = normalizeRole(role);
  const rawSubRole = typeof subRole === "string" ? subRole.trim().toUpperCase() : null;
  const normalizedSubRole = normalizeRole(subRole);
  
  // Check if raw role matches (for legacy roles like HR, FINANCE)
  if (rawRole && allowedSet.has(rawRole)) {
    return true;
  }
  
  // Check if FM-normalized role matches (for canonical roles like TEAM_MEMBER)
  if (normalizedRole && allowedSet.has(normalizedRole)) {
    return true;
  }
  
  // Check if raw subRole matches
  if (rawSubRole && allowedSet.has(rawSubRole)) {
    return true;
  }
  
  // Check if FM-normalized subRole matches
  if (normalizedSubRole && allowedSet.has(normalizedSubRole)) {
    return true;
  }
  
  return false;
}

const buildRoleChecker = (
  allowed: readonly UserRoleType[],
  legacy: readonly string[] = [],
): RoleChecker => {
  const allowedSet = new Set(allowed.map((role) => role.toUpperCase()));
  const legacySet = new Set(legacy.map((role) => role.toUpperCase()));

  return (role?: string | null) => {
    const normalized = normalizeRole(role);
    if (!normalized) {
      return false;
    }
    return allowedSet.has(normalized) || legacySet.has(normalized);
  };
};

export const canManageSubscriptions = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.ADMIN,
    UserRole.FINANCE,
  ],
  ["BILLING_ADMIN", "FINANCE_ADMIN"],
);

// 🔒 STRICT v4: Finance access limited to Finance Officer + Corporate Admin
// NOTE: Both FINANCE (base role) and FINANCE_OFFICER (sub-role) are granted access
// Per least-privilege principle, view-only access is appropriate for routine work
export const canViewInvoices = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE, // Finance base role
    UserRole.FINANCE_OFFICER, // STRICT v4 sub-role
  ],
  ["BILLING_ADMIN", "FINANCE_ADMIN"],
);

// 🔒 STRICT v4: Finance edit limited to Finance Officer + Corporate Admin
// SECURITY NOTE: Finance Officer (FINANCE/FINANCE_OFFICER roles) can edit but NOT delete invoices
// Delete operations require SUPER_ADMIN or CORPORATE_ADMIN approval
// This guards against accidental/malicious deletion by standard finance staff
export const canEditInvoices = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE, // Finance base role
    UserRole.FINANCE_OFFICER, // STRICT v4 sub-role
  ],
  ["BILLING_ADMIN", "FINANCE_ADMIN"],
);

// 🔒 STRICT v4: Invoice DELETE restricted to admin-level roles only
// Finance Officer intentionally EXCLUDED - requires manager approval for deletions
export const canDeleteInvoices = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    // NOTE: FINANCE role intentionally NOT included (least-privilege principle)
  ],
  ["BILLING_ADMIN"], // Legacy admin roles may have delete access
);

export const canManageOwnerGroups = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.FM_MANAGER,
    UserRole.PROPERTY_MANAGER,
  ],
  ["PROPERTY_ADMIN"],
);

// =============================================================================
// SEC-004 FIX: HR Role Guards for Payroll Access Control
// STRICT v4.1: Least-privilege access to sensitive payroll data
// =============================================================================

/**
 * 🔒 STRICT v4: Payroll VIEW access - HR, Finance, and Admins
 * Read-only access to payroll data for reporting and audit purposes
 * 
 * COMPLIANCE:
 * - Saudi Labor Law Article 52: Salary confidentiality
 * - GDPR Article 6: Lawful basis for processing (legitimate interest)
 * - ISO 27001 A.9.1.1: Access control policy
 */
export const canViewPayroll = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.HR,              // HR base role
    UserRole.HR_OFFICER,      // STRICT v4.1 sub-role - view only
    UserRole.FINANCE,         // Finance base role
    UserRole.FINANCE_OFFICER, // STRICT v4.1 sub-role - view only
  ],
  ["PAYROLL_ADMIN", "HR_ADMIN", "HR_MANAGER"],
);

/**
 * 🔒 STRICT v4: Payroll EDIT access - HR and Admins ONLY
 * Write access restricted to prevent unauthorized salary modifications
 * 
 * SECURITY NOTE: Finance Officer can VIEW but NOT EDIT payroll
 * This separation of duties prevents fraud and ensures audit compliance
 * 
 * COMPLIANCE:
 * - SOX Section 404: Internal controls over financial reporting
 * - Saudi Labor Law Article 90: Wage protection
 */
export const canEditPayroll = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.HR,              // HR base role can edit
    // NOTE: HR_OFFICER intentionally excluded - requires manager approval for edits
    // NOTE: FINANCE roles intentionally excluded - separation of duties
  ],
  ["PAYROLL_ADMIN", "HR_MANAGER"],
);

/**
 * 🔒 STRICT v4: Payroll DELETE access - Admin-level roles ONLY
 * Delete operations require highest-level approval
 * 
 * SECURITY NOTE: Even HR cannot delete payroll records
 * This ensures audit trail integrity and regulatory compliance
 */
export const canDeletePayroll = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    // NOTE: HR role intentionally excluded - requires admin approval
  ],
  [],
);

/**
 * 🔒 STRICT v4: Payroll APPROVE access - For finalizing payroll runs
 * Dual approval: requires both HR and Finance approval
 * This function checks if user can give HR approval
 */
export const canApprovePayrollHR = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.HR,
  ],
  ["PAYROLL_ADMIN", "HR_MANAGER"],
);

/**
 * 🔒 STRICT v4: Payroll Finance Approval - For budget sign-off
 * This function checks if user can give Finance approval
 */
export const canApprovePayrollFinance = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER,
  ],
  ["FINANCE_ADMIN"],
);
