/**
 * useAuthRbac Hook
 *
 * Client-side hook for permission checking and role-based access control.
 * Uses NextAuth session for authentication state.
 *
 * Usage:
 * ```typescript
 * const { isSuperAdmin, can, canAny, canAll } = useAuthRbac();
 *
 * if (can('finance:invoice.create')) {
 *   // Show create button
 * }
 * ```
 */

"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { RbacContext } from "@/lib/rbac";

export interface UseAuthRbac extends RbacContext {
  /**
   * Check if user has a specific permission
   */
  can: (_perm: string) => boolean;

  /**
   * Check if user has ANY of the specified permissions
   */
  canAny: (_perms: string[]) => boolean;

  /**
   * Check if user has ALL of the specified permissions
   */
  canAll: (_perms: string[]) => boolean;

  /**
   * Check if user has permission for a specific module
   */
  canModule: (_module: string) => boolean;

  /**
   * Check if user has a specific role
   */
  hasRole: (_roleSlug: string) => boolean;

  /**
   * Check if user has ANY of the specified roles
   */
  hasAnyRole: (_roleSlugs: string[]) => boolean;

  /**
   * Session loading state
   */
  isLoading: boolean;

  /**
   * User is authenticated
   */
  isAuthenticated: boolean;
}

/**
 * Hook for RBAC permission checking
 *
 * @returns RBAC context with permission checking functions
 */
export function useAuthRbac(): UseAuthRbac {
  const { data: session, status } = useSession();

  const isSuperAdmin = useMemo(
    () => !!session?.user?.isSuperAdmin,
    [session?.user?.isSuperAdmin],
  );

  const permissions = useMemo(
    () => (session?.user?.permissions as string[]) || [],
    [session?.user?.permissions],
  );

  const roles = useMemo(
    () => (session?.user?.roles as string[]) || [],
    [session?.user?.roles],
  );

  const can = useMemo(
    () => (_perm: string) => {
      if (isSuperAdmin) return true;
      return permissions.includes(_perm);
    },
    [isSuperAdmin, permissions],
  );

  const canAny = useMemo(
    () => (_perms: string[]) => {
      if (isSuperAdmin) return true;
      if (!_perms || _perms.length === 0) return false;
      return _perms.some((p) => permissions.includes(p));
    },
    [isSuperAdmin, permissions],
  );

  const canAll = useMemo(
    () => (_perms: string[]) => {
      if (isSuperAdmin) return true;
      if (!_perms || _perms.length === 0) return true;
      return _perms.every((p) => permissions.includes(p));
    },
    [isSuperAdmin, permissions],
  );

  const canModule = useMemo(
    () => (_module: string) => {
      if (isSuperAdmin) return true;
      return permissions.some((p) => p.startsWith(`${_module}:`));
    },
    [isSuperAdmin, permissions],
  );

  const hasRole = useMemo(
    () => (_roleSlug: string) => {
      if (isSuperAdmin && _roleSlug === "super_admin") return true;
      return roles.includes(_roleSlug);
    },
    [isSuperAdmin, roles],
  );

  const hasAnyRole = useMemo(
    () => (_roleSlugs: string[]) => {
      if (isSuperAdmin && _roleSlugs.includes("super_admin")) return true;
      if (!_roleSlugs || _roleSlugs.length === 0) return false;
      return _roleSlugs.some((r) => roles.includes(r));
    },
    [isSuperAdmin, roles],
  );

  return {
    isSuperAdmin,
    permissions,
    roles,
    can,
    canAny,
    canAll,
    canModule,
    hasRole,
    hasAnyRole,
    isLoading: status === "loading",
    isAuthenticated: !!session?.user,
  };
}

/**
 * Hook to check a single permission (simplified)
 *
 * @param permission Permission key to check
 * @returns true if user has permission or is Super Admin
 */
export function useCan(permission: string): boolean {
  const { can } = useAuthRbac();
  return can(permission);
}

/**
 * Hook to check if user is Super Admin
 *
 * @returns true if user is Super Admin
 */
export function useIsSuperAdmin(): boolean {
  const { isSuperAdmin } = useAuthRbac();
  return isSuperAdmin;
}

/**
 * Hook to check if user has a specific role
 *
 * @param roleSlug Role slug to check
 * @returns true if user has the role
 */
export function useHasRole(roleSlug: string): boolean {
  const { hasRole } = useAuthRbac();
  return hasRole(roleSlug);
}
