/**
 * FM Permissions Hook Wrapper
 * Combines useFMPermissions and useAuthRbac for complete FM permission checks.
 * 
 * This allows components in the FM module to use a consistent import path
 * with all necessary permission checking functions.
 */

import { useFMPermissions, type FMPermissionContext } from "@/hooks/useFMPermissions";
import { useAuthRbac } from "@/hooks/useAuthRbac";

export type { FMPermissionContext };

/**
 * Combined permissions hook for FM module.
 * Provides both FM-specific and general RBAC permission checks.
 */
export function useFmPermissions() {
  const fmPermissions = useFMPermissions();
  const rbacPermissions = useAuthRbac();
  
  return {
    // FM-specific permissions
    ...fmPermissions,
    // General RBAC permissions (includes hasAnyRole)
    hasAnyRole: rbacPermissions.hasAnyRole,
    hasRole: rbacPermissions.hasRole,
    can: fmPermissions.can, // Override with FM-specific can
    canAny: rbacPermissions.canAny,
    canAll: rbacPermissions.canAll,
    isSuperAdmin: rbacPermissions.isSuperAdmin,
  };
}
