/**
 * Client-side FM permissions hook
 * Provides RBAC checks for conditional UI rendering
 *
 * 🟥 SECURITY FIX: Now properly integrates with NextAuth session and org context
 * - isOrgMember is derived from actual session data (not hardcoded)
 * - Plan defaults to STARTER (fail-safe) instead of PRO
 * 
 * 🟢 CLIENT-SAFE: Imports from fm-lite.ts to avoid Mongoose bundle leak
 * 🟢 STRICT v4.1: Sub-role enforcement for TEAM_MEMBER specialized access
 */

"use client";

import { useSession } from "next-auth/react";
import {
  canClient,
  canAccessSubmodule,
  Role,
  SubmoduleKey,
  Action,
  Plan,
  SubRole,
  normalizeRole,
  normalizeSubRole,
  inferSubRoleFromRole,
  type ClientResourceCtx,
} from "@/domain/fm/fm-lite";
import { useCurrentOrg } from "@/contexts/CurrentOrgContext";

export interface FMPermissionContext {
  role: Role;
  subRole?: SubRole;
  orgId?: string;
  propertyId?: string;
  userId: string;
  plan: Plan;
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
  // 🟨 FIXED: Use the actual session hook
  const { data: session } = useSession();
  // 🟧 FIXED: Get plan from org context, default to STARTER (fail-safe)
  const { org } = useCurrentOrg();
  const plan = org?.plan || Plan.STARTER;

  const user = session?.user as
    | {
        id?: string;
        role?: string;
        subRole?: string | null;
        orgId?: string;
      }
    | undefined;

  const subRole =
    normalizeSubRole(user?.subRole) ?? inferSubRoleFromRole(user?.role);
  const role = normalizeRole(user?.role, subRole) ?? Role.GUEST;

  // ORGID-FIX: Use undefined instead of empty string for client-side permission checks
  // Empty string would incorrectly indicate "valid orgId" rather than "no orgId"
  const ctx: FMPermissionContext = {
    role,
    subRole,
    userId: user?.id || "",
    orgId: user?.orgId ?? undefined,
    propertyId: undefined,
    plan,
  };

  // 🟥 FIXED: Compute membership dynamically based on target org
  const isMemberOf = (orgId?: string): boolean =>
    !!ctx.orgId && (!orgId || orgId === ctx.orgId);

  /**
   * Build ClientResourceCtx for permission checks
   */
  const buildClientCtx = (options?: {
    orgId?: string;
    propertyId?: string;
  }): ClientResourceCtx => {
    const targetOrgId = options?.orgId ?? ctx.orgId;
    return {
      role: ctx.role,
      subRole: ctx.subRole,
      plan: ctx.plan,
      userId: ctx.userId,
      orgId: targetOrgId,
      propertyId: options?.propertyId,
      isOrgMember: isMemberOf(targetOrgId),
    };
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
    },
  ): boolean => {
    return canClient(submodule, action, buildClientCtx(options));
  };

  /**
   * Check if user has access to a module based on subscription plan and role
   */
  const canAccessModule = (submodule: SubmoduleKey): boolean => {
    return canAccessSubmodule(submodule, buildClientCtx());
  };

  /**
   * Get allowed actions for a submodule
   */
  const getAllowedActions = (submodule: SubmoduleKey): Action[] => {
    const actions: Action[] = [
      "view",
      "create",
      "update",
      "delete",
      "approve",
      "assign",
      "export",
    ];
    return actions.filter((action) => canPerform(submodule, action));
  };

  /**
   * Check if user is admin (SUPER_ADMIN or ADMIN)
   * RBAC-003 FIX: Use canonical FM roles
   */
  const isAdmin = (): boolean => {
    return ctx.role === Role.SUPER_ADMIN || ctx.role === Role.ADMIN;
  };

  /**
   * Check if user is management level
   * RBAC-003 FIX: Use canonical FM roles (TEAM_MEMBER hierarchy)
   */
  const isManagement = (): boolean => {
    return (
      ctx.role === Role.TEAM_MEMBER ||
      ctx.role === Role.PROPERTY_MANAGER ||
      ctx.role === Role.SUPER_ADMIN ||
      ctx.role === Role.ADMIN
    );
  };
  
  /**
   * Check if user can view financial data
   * STRICT v4.1: Requires FINANCE_OFFICER sub-role for TEAM_MEMBER
   */
  const canViewFinancials = (): boolean => {
    // Admins and Corporate Owners can always view financials
    if (ctx.role === Role.SUPER_ADMIN || ctx.role === Role.ADMIN) {
      return canPerform(SubmoduleKey.FINANCE_INVOICES, "view");
    }
    if (ctx.role === Role.CORPORATE_OWNER) {
      return canPerform(SubmoduleKey.FINANCE_INVOICES, "view");
    }
    // TEAM_MEMBER requires FINANCE_OFFICER sub-role
    if (ctx.role === Role.TEAM_MEMBER) {
      return ctx.subRole === SubRole.FINANCE_OFFICER && 
             canPerform(SubmoduleKey.FINANCE_INVOICES, "view");
    }
    // Other roles cannot view financials
    return false;
  };

  /**
   * Check if user can manage HR data
   * STRICT v4.1: Requires HR_OFFICER sub-role for TEAM_MEMBER
   */
  const canViewHR = (): boolean => {
    if (ctx.role === Role.SUPER_ADMIN || ctx.role === Role.ADMIN) {
      return canPerform(SubmoduleKey.HR_EMPLOYEE_DIRECTORY, "view");
    }
    if (ctx.role === Role.TEAM_MEMBER) {
      return ctx.subRole === SubRole.HR_OFFICER &&
             canPerform(SubmoduleKey.HR_EMPLOYEE_DIRECTORY, "view");
    }
    return false;
  };

  return {
    role: ctx.role,
    subRole: ctx.subRole,
    orgId: ctx.orgId,
    userId: ctx.userId,
    plan: ctx.plan,
    can: canPerform,
    canAccessModule,
    getAllowedActions,
    isAdmin,
    isManagement,
    // Convenience methods for common checks
    canCreateWO: () => canPerform(SubmoduleKey.WO_CREATE, "create"),
    canAssignWO: () => canPerform(SubmoduleKey.WO_TRACK_ASSIGN, "assign"),
    canApproveWO: () => canPerform(SubmoduleKey.WO_TRACK_ASSIGN, "approve"),
    canViewProperties: () => canPerform(SubmoduleKey.PROP_LIST, "view"),
    canManageProperties: () => canPerform(SubmoduleKey.PROP_LIST, "update"),
    canViewFinancials,
    canViewHR,
  };
}
