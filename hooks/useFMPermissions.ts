/**
 * Client-side FM permissions hook
 * Provides RBAC checks for conditional UI rendering
 *
 * 🟥 SECURITY FIX: Now properly integrates with NextAuth session and org context
 * - isOrgMember is derived from actual session data (not hardcoded)
 * - Plan defaults to STARTER (fail-safe) instead of PRO
 */

"use client";

import { useSession } from "next-auth/react";
import {
  can,
  Role,
  SubmoduleKey,
  Action,
  PLAN_GATES,
  Plan,
} from "@/domain/fm/fm.behavior";
import { useCurrentOrg } from "@/contexts/CurrentOrgContext";

export interface FMPermissionContext {
  role: Role;
  orgId: string;
  propertyId?: string;
  userId: string;
  plan: Plan;
}

// Map NextAuth roles to internal FM Role enum
// This provides a single source of truth for role mapping.
const roleMapping: Record<string, Role> = {
  SUPER_ADMIN: Role.SUPER_ADMIN,
  CORPORATE_ADMIN: Role.CORPORATE_ADMIN,
  FM_MANAGER: Role.MANAGEMENT,
  MANAGEMENT: Role.MANAGEMENT,
  FINANCE: Role.FINANCE,
  HR: Role.HR,
  EMPLOYEE: Role.EMPLOYEE,
  PROPERTY_OWNER: Role.PROPERTY_OWNER,
  OWNER: Role.PROPERTY_OWNER,
  OWNER_DEPUTY: Role.OWNER_DEPUTY,
  TECHNICIAN: Role.TECHNICIAN,
  TENANT: Role.TENANT,
  VENDOR: Role.VENDOR,
  GUEST: Role.GUEST,
};

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
        orgId?: string;
      }
    | undefined;

  const userRole = user?.role || "GUEST";
  const role = roleMapping[userRole] || Role.GUEST;

  const ctx: FMPermissionContext = {
    role,
    userId: user?.id || "",
    orgId: user?.orgId || "",
    propertyId: undefined,
    plan,
  };

  // 🟥 FIXED: Compute membership dynamically based on target org
  const isMemberOf = (orgId?: string): boolean =>
    !!ctx.orgId && (!orgId || orgId === ctx.orgId);

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
    // Check against the resource's org or the user's org
    const targetOrgId = options?.orgId ?? ctx.orgId;

    return can(submodule, action, {
      role: ctx.role,
      orgId: targetOrgId,
      propertyId: options?.propertyId,
      userId: ctx.userId,
      plan: ctx.plan,
      isOrgMember: isMemberOf(targetOrgId), // 🟥 FIXED: Recompute for target org
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
    const actions: Action[] = [
      "view",
      "create",
      "update",
      "delete",
      "approve",
      "assign",
    ];
    return actions.filter((action) => canPerform(submodule, action));
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
    return (
      ctx.role === Role.MANAGEMENT ||
      ctx.role === Role.SUPER_ADMIN ||
      ctx.role === Role.CORPORATE_ADMIN
    );
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
    canCreateWO: () => canPerform(SubmoduleKey.WO_CREATE, "create"),
    canAssignWO: () => canPerform(SubmoduleKey.WO_TRACK_ASSIGN, "assign"),
    canApproveWO: () => canPerform(SubmoduleKey.WO_CREATE, "approve"),
    canViewProperties: () => canPerform(SubmoduleKey.PROP_LIST, "view"),
    canManageProperties: () => canPerform(SubmoduleKey.PROP_LIST, "update"),
    canViewFinancials: () =>
      canPerform(SubmoduleKey.PROP_LIST, "view") && ctx.role !== Role.TENANT,
  };
}
