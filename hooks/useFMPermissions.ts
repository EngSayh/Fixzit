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

// RBAC-003 FIX: Map NextAuth roles (14-role matrix from types/user.ts) to FM Role enum
// FM domain uses 9 canonical roles: SUPER_ADMIN, ADMIN, CORPORATE_OWNER, TEAM_MEMBER,
// TECHNICIAN, PROPERTY_MANAGER, TENANT, VENDOR, GUEST
// The 14-role matrix roles (FINANCE, HR, FM_MANAGER, etc.) map to these canonical roles
// PHASE-3 FIX: Added specialized sub-roles (FINANCE_OFFICER, HR_OFFICER, etc.)
const roleMapping: Record<string, Role> = {
  // STRICT v4 14-role matrix → FM canonical roles
  SUPER_ADMIN: Role.SUPER_ADMIN,
  CORPORATE_ADMIN: Role.ADMIN, // Fixed: CORPORATE_ADMIN → ADMIN (alias in fm.behavior.ts)
  ADMIN: Role.ADMIN,
  MANAGER: Role.TEAM_MEMBER, // Fixed: MANAGER → TEAM_MEMBER
  
  // FM roles
  FM_MANAGER: Role.PROPERTY_MANAGER, // Fixed: FM_MANAGER → PROPERTY_MANAGER
  PROPERTY_MANAGER: Role.PROPERTY_MANAGER,
  TECHNICIAN: Role.TECHNICIAN,
  
  // Business function roles → TEAM_MEMBER (use SubRole for specialization)
  FINANCE: Role.TEAM_MEMBER, // Fixed: Finance is TEAM_MEMBER with module access
  FINANCE_OFFICER: Role.TEAM_MEMBER, // PHASE-3: Specialized finance sub-role
  HR: Role.TEAM_MEMBER, // Fixed: HR is TEAM_MEMBER with module access
  HR_OFFICER: Role.TEAM_MEMBER, // PHASE-3: Specialized HR sub-role
  PROCUREMENT: Role.TEAM_MEMBER,
  SUPPORT_AGENT: Role.TEAM_MEMBER, // PHASE-3: Support + CRM access
  OPERATIONS_MANAGER: Role.TEAM_MEMBER, // PHASE-3: Wider operational scope
  
  // Property & External roles
  OWNER: Role.CORPORATE_OWNER, // Fixed: OWNER → CORPORATE_OWNER
  TENANT: Role.TENANT,
  VENDOR: Role.VENDOR,
  AUDITOR: Role.TEAM_MEMBER, // Fixed: AUDITOR → TEAM_MEMBER (read-only specialization)
  
  // Legacy aliases for backward compatibility
  TEAM_MEMBER: Role.TEAM_MEMBER,
  CORPORATE_OWNER: Role.CORPORATE_OWNER,
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

  // ORGID-FIX: Use undefined instead of empty string for client-side permission checks
  // Empty string would incorrectly indicate "valid orgId" rather than "no orgId"
  const ctx: FMPermissionContext = {
    role,
    userId: user?.id || "",
    orgId: user?.orgId || undefined,  // ✅ undefined (not "") for missing orgId
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
