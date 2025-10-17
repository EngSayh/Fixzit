/**
 * Client-side FM permissions hook
 * Provides RBAC checks for conditional UI rendering
 */

'use client';

import { can, Role, SubmoduleKey, Action, PLAN_GATES, Plan } from '@/domain/fm/fm.behavior';

export interface FMPermissionContext {
  role: Role;
  orgId: string;
  propertyId?: string;
  userId: string;
  plan?: Plan;
}

/**
 * Hook to check FM permissions in React components
 * 
 * @example
 * const permissions = useFMPermissions();
 * 
 * if (permissions.can('WO_CREATE', 'create')) {
 *   return <CreateWorkOrderButton />;
 * }
 * 
 * if (permissions.canAccessModule('WO_PM')) {
 *   return <PreventiveMaintenanceSection />;
 * }
 */
export function useFMPermissions() {
  // TODO: Replace with actual session hook when available
  const session = typeof window !== 'undefined' ? { user: { role: 'GUEST', id: '', orgId: '' } } : null;

  // Map session role to FM Role enum
  const roleMapping: Record<string, Role> = {
    'SUPER_ADMIN': Role.SUPER_ADMIN,
    'CORPORATE_ADMIN': Role.CORPORATE_ADMIN,
    'FM_MANAGER': Role.MANAGEMENT,
    'MANAGEMENT': Role.MANAGEMENT,
    'FINANCE': Role.FINANCE,
    'HR': Role.HR,
    'EMPLOYEE': Role.EMPLOYEE,
    'PROPERTY_OWNER': Role.PROPERTY_OWNER,
    'OWNER': Role.PROPERTY_OWNER,
    'OWNER_DEPUTY': Role.OWNER_DEPUTY,
    'TECHNICIAN': Role.TECHNICIAN,
    'TENANT': Role.TENANT,
    'VENDOR': Role.VENDOR,
    'GUEST': Role.GUEST,
  };

  const userRole = session?.user?.role || 'GUEST';
  const role = roleMapping[userRole] || Role.GUEST;

  const ctx: FMPermissionContext = {
    role,
    userId: session?.user?.id || '',
    orgId: (session?.user as { orgId?: string })?.orgId || '',
    propertyId: undefined,
    plan: Plan.PRO // TODO: Get from user/org subscription
  };

  /**
   * Check if user can perform an action on a submodule
   */
  const canPerform = (
    submodule: SubmoduleKey,
    action: Action,
    options?: {
      orgId?: string;
      propertyId?: string;
    }
  ): boolean => {
    return can(submodule, action, {
      role: ctx.role,
      orgId: options?.orgId || ctx.orgId,
      propertyId: options?.propertyId,
      userId: ctx.userId,
      plan: ctx.plan || Plan.STARTER,
      isOrgMember: true // TODO: Verify org membership
    });
  };

  /**
   * Check if user has access to a module based on subscription plan
   */
  const canAccessModule = (submodule: SubmoduleKey): boolean => {
    const planGates = PLAN_GATES[ctx.plan || Plan.STARTER];
    return planGates[submodule] === true;
  };

  /**
   * Get allowed actions for a submodule
   */
  const getAllowedActions = (submodule: SubmoduleKey): Action[] => {
    const actions: Action[] = ['view', 'create', 'update', 'delete', 'approve', 'assign'];
    return actions.filter(action => canPerform(submodule, action));
  };

  /**
   * Check if user is admin (SUPER_ADMIN or CORPORATE_ADMIN)
   */
  const isAdmin = (): boolean => {
    return ctx.role === Role.SUPER_ADMIN || ctx.role === Role.CORPORATE_ADMIN;
  };

  /**
   * Check if user is management level
   */
  const isManagement = (): boolean => {
    return ctx.role === Role.MANAGEMENT || ctx.role === Role.SUPER_ADMIN || ctx.role === Role.CORPORATE_ADMIN;
  };

  return {
    role: ctx.role,
    orgId: ctx.orgId,
    userId: ctx.userId,
    plan: ctx.plan,
    can: canPerform,
    canAccessModule,
    getAllowedActions,
    isAdmin,
    isManagement,
    // Convenience methods for common checks
    canCreateWO: () => canPerform(SubmoduleKey.WO_CREATE, 'create'),
    canAssignWO: () => canPerform(SubmoduleKey.WO_TRACK_ASSIGN, 'assign'),
    canApproveWO: () => canPerform(SubmoduleKey.WO_CREATE, 'approve'),
    canViewProperties: () => canPerform(SubmoduleKey.PROP_LIST, 'view'),
    canManageProperties: () => canPerform(SubmoduleKey.PROP_LIST, 'update'),
    canViewFinancials: () => canPerform(SubmoduleKey.PROP_LIST, 'view') && ctx.role !== Role.TENANT,
  };
}
