/**
 * Role-Based Access Control (RBAC) Configuration for Finance Pack
 * 
 * Defines which roles can access which finance endpoints
 */

import { logger } from '@/lib/logger';

export const UserRole = {
  ADMIN: 'ADMIN',
  FINANCE_OFFICER: 'FINANCE_OFFICER',
  FINANCE_MANAGER: 'FINANCE_MANAGER',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
  TENANT: 'TENANT',
  VENDOR: 'VENDOR',
} as const;

export type Role = typeof UserRole[keyof typeof UserRole];

/**
 * Finance permissions by endpoint/operation
 */
export const FinancePermissions = {
  // Chart of Accounts
  'finance.accounts.read': [UserRole.ADMIN, UserRole.FINANCE_OFFICER, UserRole.FINANCE_MANAGER, UserRole.MANAGER],
  'finance.accounts.create': [UserRole.ADMIN, UserRole.FINANCE_OFFICER],
  'finance.accounts.update': [UserRole.ADMIN, UserRole.FINANCE_OFFICER],
  'finance.accounts.delete': [UserRole.ADMIN],

  // Expenses
  'finance.expenses.read': [UserRole.ADMIN, UserRole.FINANCE_OFFICER, UserRole.FINANCE_MANAGER, UserRole.MANAGER, UserRole.STAFF],
  'finance.expenses.create': [UserRole.ADMIN, UserRole.FINANCE_OFFICER, UserRole.FINANCE_MANAGER, UserRole.MANAGER, UserRole.STAFF],
  'finance.expenses.update': [UserRole.ADMIN, UserRole.FINANCE_OFFICER, UserRole.FINANCE_MANAGER, UserRole.MANAGER, UserRole.STAFF],
  'finance.expenses.delete': [UserRole.ADMIN, UserRole.FINANCE_OFFICER],
  'finance.expenses.submit': [UserRole.ADMIN, UserRole.FINANCE_OFFICER, UserRole.FINANCE_MANAGER, UserRole.MANAGER, UserRole.STAFF],
  'finance.expenses.approve': [UserRole.ADMIN, UserRole.FINANCE_MANAGER, UserRole.MANAGER],
  'finance.expenses.reject': [UserRole.ADMIN, UserRole.FINANCE_MANAGER, UserRole.MANAGER],

  // Payments
  'finance.payments.read': [UserRole.ADMIN, UserRole.FINANCE_OFFICER, UserRole.FINANCE_MANAGER, UserRole.MANAGER],
  'finance.payments.create': [UserRole.ADMIN, UserRole.FINANCE_OFFICER, UserRole.FINANCE_MANAGER],
  'finance.payments.update': [UserRole.ADMIN, UserRole.FINANCE_OFFICER, UserRole.FINANCE_MANAGER],
  'finance.payments.delete': [UserRole.ADMIN, UserRole.FINANCE_OFFICER],
  'finance.payments.reconcile': [UserRole.ADMIN, UserRole.FINANCE_OFFICER, UserRole.FINANCE_MANAGER],
  'finance.payments.clear': [UserRole.ADMIN, UserRole.FINANCE_OFFICER, UserRole.FINANCE_MANAGER],
  'finance.payments.bounce': [UserRole.ADMIN, UserRole.FINANCE_OFFICER, UserRole.FINANCE_MANAGER],
  'finance.payments.cancel': [UserRole.ADMIN, UserRole.FINANCE_OFFICER],
  'finance.payments.refund': [UserRole.ADMIN, UserRole.FINANCE_MANAGER],

  // Journals
  'finance.journals.read': [UserRole.ADMIN, UserRole.FINANCE_OFFICER, UserRole.FINANCE_MANAGER],
  'finance.journals.create': [UserRole.ADMIN, UserRole.FINANCE_OFFICER],
  'finance.journals.post': [UserRole.ADMIN, UserRole.FINANCE_OFFICER],
  'finance.journals.void': [UserRole.ADMIN, UserRole.FINANCE_MANAGER],

  // Ledger
  'finance.ledger.read': [UserRole.ADMIN, UserRole.FINANCE_OFFICER, UserRole.FINANCE_MANAGER, UserRole.MANAGER],
  'finance.ledger.trial-balance': [UserRole.ADMIN, UserRole.FINANCE_OFFICER, UserRole.FINANCE_MANAGER, UserRole.MANAGER],
  'finance.ledger.account-activity': [UserRole.ADMIN, UserRole.FINANCE_OFFICER, UserRole.FINANCE_MANAGER, UserRole.MANAGER],
} as const;

/**
 * Check if a user role has permission for a specific operation
 */
export function hasPermission(userRole: string, permission: keyof typeof FinancePermissions): boolean {
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
export function requirePermission(userRole: string | undefined, permission: keyof typeof FinancePermissions): void {
  if (!userRole) {
    throw new Error('User role not defined');
  }
  
  if (!hasPermission(userRole, permission)) {
    throw new Error(`Forbidden: User role '${userRole}' lacks permission '${permission}'`);
  }
}

/**
 * Express/Next.js middleware wrapper for permission checks
 */
export function checkPermission(permission: keyof typeof FinancePermissions) {
  return (user: { role?: string }) => {
    if (!user.role) {
      return { authorized: false, error: 'User role not found' };
    }
    
    if (!hasPermission(user.role, permission)) {
      return { 
        authorized: false, 
        error: `Insufficient permissions. Required: ${permission}` 
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
