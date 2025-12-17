/**
 * @module lib/rbac
 * @description RBAC (Role-Based Access Control) Utilities for Fixzit
 *
 * Provides unified permission checking functions for server-side and client-side
 * authorization with Super Admin bypass and module-scoped permission management.
 *
 * @features
 * - **Permission Format**: "module:action" convention (e.g., "finance:invoice.read")
 * - **Super Admin Bypass**: isSuperAdmin=true grants all permissions automatically
 * - **Flexible Checks**: Single permission, any-of, all-of, and module-wide checks
 * - **Role-Based Queries**: Check for specific role slugs (e.g., "property_owner")
 * - **Common Permission Constants**: Pre-defined patterns for 11 modules (Finance, HR, CRM, etc.)
 * - **Session Integration**: `createRbacContext()` converts NextAuth session to RBAC context
 * - **Client-Safe**: No database dependencies; works in browser and Edge runtime
 *
 * @usage
 * Check single permission (server or client):
 * ```typescript
 * import { can, createRbacContext } from '@/lib/rbac';
 * import { auth } from '@/auth'; // NextAuth session
 *
 * const session = await auth();
 * const rbacCtx = createRbacContext(session?.user);
 *
 * if (can(rbacCtx, 'finance:invoice.read')) {
 *   // User can view invoices
 * }
 * ```
 *
 * Check multiple permissions (any-of):
 * ```typescript
 * import { canAny } from '@/lib/rbac';
 *
 * if (canAny(rbacCtx, ['finance:invoice.approve', 'finance:invoice.delete'])) {
 *   // User can either approve OR delete invoices
 * }
 * ```
 *
 * Check module access:
 * ```typescript
 * import { canModule, getModulePermissions } from '@/lib/rbac';
 *
 * if (canModule(rbacCtx, 'finance')) {
 *   const permissions = getModulePermissions(rbacCtx, 'finance');
 *   console.log('Finance permissions:', permissions);
 *   // e.g., ["finance:invoice.read", "finance:payment.read"]
 * }
 * ```
 *
 * Use permission constants:
 * ```typescript
 * import { can, PermissionPatterns } from '@/lib/rbac';
 *
 * if (can(rbacCtx, PermissionPatterns.ADMIN_USERS_MANAGE)) {
 *   // User can manage users
 * }
 * ```
 *
 * Check roles:
 * ```typescript
 * import { hasRole, hasAnyRole, isSuperAdmin } from '@/lib/rbac';
 *
 * if (isSuperAdmin(rbacCtx)) {
 *   // Unlimited access (bypasses all permission checks)
 * }
 *
 * if (hasRole(rbacCtx, 'property_owner')) {
 *   // User is a Property Owner
 * }
 *
 * if (hasAnyRole(rbacCtx, ['admin', 'super_admin'])) {
 *   // User is either Admin or Super Admin
 * }
 * ```
 *
 * @security
 * - **Super Admin Bypass**: `isSuperAdmin=true` grants ALL permissions - use with extreme caution
 * - **Null-Safe**: All functions return `false` for null/undefined contexts (deny-by-default)
 * - **No DB Queries**: Pure permission logic - actual permissions must come from session/JWT
 * - **Permission Injection**: NEVER accept permissions from client headers/query params
 * - **Session Source**: Always use `session.user` from NextAuth (authenticated source)
 * - **Edge-Safe**: No Node.js dependencies; compatible with Edge Runtime middleware
 *
 * @compliance
 * - **Audit Trail**: Combine with lib/audit.ts to log all permission checks
 * - **Least Privilege**: Deny-by-default; explicit permission grant required
 * - **ZATCA/HFV**: Finance module permissions enforce e-invoice approval workflows
 *
 * @deployment
 * No environment variables required (permission data comes from session).
 *
 * **Permission Format Convention**:
 * - Structure: `module:resource.action`
 * - Examples:
 *   - `finance:invoice.read` - View invoices
 *   - `finance:invoice.approve` - Approve invoices
 *   - `workorders:assign` - Assign work orders
 *   - `admin:users.manage` - Manage users
 *
 * **Module List** (11 modules):
 * 1. `finance` - Invoices, payments, budgets
 * 2. `workorders` - Work order management
 * 3. `properties` - Property CRUD
 * 4. `hr` - Employee management, payroll
 * 5. `crm` - Leads, customers
 * 6. `admin` - Settings, users, roles
 * 7. `reports` - Analytics and exports
 * 8. `marketplace` - Product catalog (Fixzit Souq)
 * 9. `support` - Tickets, helpdesk
 * 10. `compliance` - ZATCA audits, PDPL
 * 11. `system` - Infrastructure management
 *
 * **Super Admin Privileges**:
 * - Bypasses ALL permission checks (including module-level)
 * - Returns `true` for every `can()`, `canAny()`, `canAll()`, `canModule()` call
 * - Only role with `admin:super.grant` and `admin:impersonate` permissions
 *
 * @performance
 * - All functions are O(1) or O(n) where n = number of permissions (typically <100)
 * - No database queries; uses in-memory permission array from JWT
 * - Client-safe; can be used in React components without API calls
 *
 * @see {@link /domain/fm/fm.types.ts} for Facility Management role definitions
 * @see {@link /server/models/Role.ts} for Role model with permission assignments
 * @see {@link /lib/audit.ts} for permission check audit logging
 * @see {@link /auth.ts} for session management and JWT payload structure
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
