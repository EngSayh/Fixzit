/**
 * Role-Based Access Control (RBAC) Configuration for Finance Pack
 *
 * Defines which roles can access which finance endpoints
 * 🔒 STRICT v4: Aligned with 14-role matrix from types/user.ts
 */

import { logger } from "@/lib/logger";
import { UserRole as CentralUserRole } from "@/types/user";

// Re-export the central UserRole for backward compatibility
export const UserRole = CentralUserRole;

export type Role = (typeof UserRole)[keyof typeof UserRole];

/**
 * Finance permissions by endpoint/operation
 * 🔒 STRICT v4: Finance access limited to FINANCE role + Admin hierarchy
 * BLOCKER FIX: Use central UserRole (14-role matrix), removed legacy roles
 * PHASE-3 FIX: Added FINANCE_OFFICER sub-role for STRICT v4.1 compliance
 */
export const FinancePermissions = {
  // Chart of Accounts
  "finance.accounts.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.accounts.create": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.accounts.update": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.accounts.delete": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
  ],

  // Expenses - STRICT v4: Only FINANCE role can manage expenses (not MANAGER/STAFF)
  "finance.expenses.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.expenses.create": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.expenses.update": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.expenses.delete": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.expenses.submit": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.expenses.approve": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.expenses.reject": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],

  // Payments
  "finance.payments.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.payments.create": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.payments.update": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.payments.delete": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.payments.reconcile": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.payments.clear": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.payments.bounce": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.payments.cancel": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.payments.refund": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],

  // Journals
  "finance.journals.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.journals.create": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.journals.post": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.journals.void": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],

  // Ledger
  "finance.ledger.read": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.ledger.trial-balance": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],
  "finance.ledger.account-activity": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
  ],

  // Reporting
  "finance.reports.income-statement": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
    UserRole.AUDITOR,
  ],
  "finance.reports.balance-sheet": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
    UserRole.AUDITOR,
  ],
  "finance.reports.owner-statement": [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE,
    UserRole.FINANCE_OFFICER, // PHASE-3: Sub-role support
    UserRole.OWNER,
    UserRole.AUDITOR,
  ],
} as const;

/**
 * Check if a user role has permission for a specific operation
 */
export function hasPermission(
  userRole: string,
  permission: keyof typeof FinancePermissions,
): boolean {
  const allowedRoles = FinancePermissions[permission];
  if (!allowedRoles) {
    logger.warn(`Unknown permission: ${permission}`);
    return false;
  }
  return allowedRoles.includes(userRole as never);
}

/**
 * Middleware helper to check authorization
 * Throws if user lacks permission
 */
export function requirePermission(
  userRole: string | undefined,
  permission: keyof typeof FinancePermissions,
): void {
  if (!userRole) {
    throw new Error("User role not defined");
  }

  if (!hasPermission(userRole, permission)) {
    throw new Error(
      `Forbidden: User role '${userRole}' lacks permission '${permission}'`,
    );
  }
}

/**
 * Express/Next.js middleware wrapper for permission checks
 */
export function checkPermission(permission: keyof typeof FinancePermissions) {
  return (user: { role?: string }) => {
    if (!user.role) {
      return { authorized: false, error: "User role not found" };
    }

    if (!hasPermission(user.role, permission)) {
      return {
        authorized: false,
        error: `Insufficient permissions. Required: ${permission}`,
      };
    }

    return { authorized: true };
  };
}

const rbacConfig = {
  UserRole,
  FinancePermissions,
  hasPermission,
  requirePermission,
  checkPermission,
};

export default rbacConfig;
