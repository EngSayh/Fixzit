/**
 * RBAC (Role-Based Access Control) Utilities
 *
 * Provides permission checking functions for server and client.
 *
 * Permission Format: "module:action" (e.g., "finance:invoice.read")
 *
 * Super Admin Bypass: isSuperAdmin=true grants all permissions
 */

export type RbacContext = {
  isSuperAdmin: boolean;
  permissions: string[]; // "module:action" format
  roles?: string[]; // role slugs (optional)
};

/**
 * Check if user has a specific permission
 * @param ctx RBAC context (from session/JWT)
 * @param perm Permission key (e.g., "finance:invoice.read")
 * @returns true if user has permission or is Super Admin
 */
export function can(ctx: RbacContext, perm: string): boolean {
  if (!ctx) return false;
  if (ctx.isSuperAdmin) return true; // Super Admin bypass
  return ctx.permissions?.includes(perm) || false;
}

/**
 * Check if user has ANY of the specified permissions
 * @param ctx RBAC context
 * @param perms Array of permission keys
 * @returns true if user has at least one permission or is Super Admin
 */
export function canAny(ctx: RbacContext, perms: string[]): boolean {
  if (!ctx) return false;
  if (ctx.isSuperAdmin) return true; // Super Admin bypass
  if (!perms || perms.length === 0) return false;
  return perms.some((p) => ctx.permissions?.includes(p));
}

/**
 * Check if user has ALL of the specified permissions
 * @param ctx RBAC context
 * @param perms Array of permission keys
 * @returns true if user has all permissions or is Super Admin
 */
export function canAll(ctx: RbacContext, perms: string[]): boolean {
  if (!ctx) return false;
  if (ctx.isSuperAdmin) return true; // Super Admin bypass
  if (!perms || perms.length === 0) return true;
  return perms.every((p) => ctx.permissions?.includes(p));
}

/**
 * Check if user has permission for a specific module
 * @param ctx RBAC context
 * @param module Module name (e.g., "finance", "workorders")
 * @returns true if user has any permission in the module or is Super Admin
 */
export function canModule(ctx: RbacContext, module: string): boolean {
  if (!ctx) return false;
  if (ctx.isSuperAdmin) return true; // Super Admin bypass
  return ctx.permissions?.some((p) => p.startsWith(`${module}:`)) || false;
}

/**
 * Get all permissions for a specific module
 * @param ctx RBAC context
 * @param module Module name
 * @returns Array of permission keys for the module
 */
export function getModulePermissions(
  ctx: RbacContext,
  module: string,
): string[] {
  if (!ctx) return [];
  if (ctx.isSuperAdmin) return [`${module}:*`]; // Wildcard for Super Admin
  return ctx.permissions?.filter((p) => p.startsWith(`${module}:`)) || [];
}

/**
 * Check if user has a specific role
 * @param ctx RBAC context
 * @param roleSlug Role slug (e.g., "super_admin", "property_owner")
 * @returns true if user has the role
 */
export function hasRole(ctx: RbacContext, roleSlug: string): boolean {
  if (!ctx) return false;
  if (ctx.isSuperAdmin && roleSlug === "super_admin") return true;
  return ctx.roles?.includes(roleSlug) || false;
}

/**
 * Check if user has ANY of the specified roles
 * @param ctx RBAC context
 * @param roleSlugs Array of role slugs
 * @returns true if user has at least one role
 */
export function hasAnyRole(ctx: RbacContext, roleSlugs: string[]): boolean {
  if (!ctx) return false;
  if (ctx.isSuperAdmin && roleSlugs.includes("super_admin")) return true;
  if (!roleSlugs || roleSlugs.length === 0) return false;
  return roleSlugs.some((r) => ctx.roles?.includes(r));
}

/**
 * Check if user is Super Admin
 * @param ctx RBAC context
 * @returns true if user is Super Admin
 */
export function isSuperAdmin(ctx: RbacContext): boolean {
  return ctx?.isSuperAdmin || false;
}

/**
 * Create RBAC context from session/JWT data
 * @param user User object from session
 * @returns RBAC context
 */
export function createRbacContext(
  user:
    | { isSuperAdmin?: boolean; permissions?: string[]; roles?: string[] }
    | null
    | undefined,
): RbacContext {
  return {
    isSuperAdmin: user?.isSuperAdmin || false,
    permissions: user?.permissions || [],
    roles: user?.roles || [],
  };
}

/**
 * Permission categories for common operations
 */
export const PermissionActions = {
  READ: "read",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  APPROVE: "approve",
  EXPORT: "export",
  IMPORT: "import",
  MANAGE: "manage",
} as const;

/**
 * Common permission patterns
 */
export const PermissionPatterns = {
  // Finance
  FINANCE_INVOICE_READ: "finance:invoice.read",
  FINANCE_INVOICE_CREATE: "finance:invoice.create",
  FINANCE_INVOICE_UPDATE: "finance:invoice.update",
  FINANCE_INVOICE_DELETE: "finance:invoice.delete",
  FINANCE_PAYMENT_READ: "finance:payment.read",
  FINANCE_PAYMENT_CREATE: "finance:payment.create",

  // Work Orders
  WORKORDERS_READ: "workorders:read",
  WORKORDERS_CREATE: "workorders:create",
  WORKORDERS_UPDATE: "workorders:update",
  WORKORDERS_DELETE: "workorders:delete",
  WORKORDERS_ASSIGN: "workorders:assign",
  WORKORDERS_APPROVE: "workorders:approve",

  // Properties
  PROPERTIES_READ: "properties:read",
  PROPERTIES_CREATE: "properties:create",
  PROPERTIES_UPDATE: "properties:update",
  PROPERTIES_DELETE: "properties:delete",

  // HR
  HR_EMPLOYEE_READ: "hr:employee.read",
  HR_EMPLOYEE_CREATE: "hr:employee.create",
  HR_EMPLOYEE_UPDATE: "hr:employee.update",
  HR_EMPLOYEE_DELETE: "hr:employee.delete",
  HR_PAYROLL_READ: "hr:payroll.read",
  HR_PAYROLL_PROCESS: "hr:payroll.process",

  // Admin
  ADMIN_SETTINGS_READ: "admin:settings.read",
  ADMIN_SETTINGS_WRITE: "admin:settings.write",
  ADMIN_USERS_READ: "admin:users.read",
  ADMIN_USERS_MANAGE: "admin:users.manage",
  ADMIN_ROLES_MANAGE: "admin:roles.manage",
  ADMIN_SUPER_GRANT: "admin:super.grant",
  ADMIN_SUPER_REVOKE: "admin:super.revoke",
  ADMIN_IMPERSONATE: "admin:impersonate",

  // Reports
  REPORTS_VIEW: "reports:view",
  REPORTS_EXPORT: "reports:export",

  // CRM
  CRM_LEAD_READ: "crm:lead.read",
  CRM_LEAD_CREATE: "crm:lead.create",
  CRM_LEAD_UPDATE: "crm:lead.update",

  // Marketplace
  MARKETPLACE_CATALOG_READ: "marketplace:catalog.read",
  MARKETPLACE_CATALOG_MANAGE: "marketplace:catalog.manage",

  // Support
  SUPPORT_TICKET_READ: "support:ticket.read",
  SUPPORT_TICKET_CREATE: "support:ticket.create",
  SUPPORT_TICKET_ASSIGN: "support:ticket.assign",

  // Compliance
  COMPLIANCE_VIEW: "compliance:view",
  COMPLIANCE_AUDIT: "compliance:audit",
} as const;

/**
 * Module names
 */
export const Modules = {
  FINANCE: "finance",
  WORKORDERS: "workorders",
  PROPERTIES: "properties",
  HR: "hr",
  CRM: "crm",
  ADMIN: "admin",
  REPORTS: "reports",
  MARKETPLACE: "marketplace",
  SUPPORT: "support",
  COMPLIANCE: "compliance",
  SYSTEM: "system",
} as const;
