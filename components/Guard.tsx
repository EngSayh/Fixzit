/**
 * RBAC Guard Component
 * 
 * Conditionally renders children based on permission checks.
 * Uses NextAuth session data with RBAC fields.
 * 
 * Usage:
 * ```typescript
 * import Guard from '@/components/Guard';
 * 
 * // Simple permission check
 * <Guard permission="finance:invoice.create">
 *   <CreateInvoiceButton />
 * </Guard>
 * 
 * // Check multiple permissions (ANY)
 * <Guard permissions={['finance:invoice.read', 'finance:invoice.create']} requireAny>
 *   <InvoiceList />
 * </Guard>
 * 
 * // Check multiple permissions (ALL)
 * <Guard permissions={['finance:invoice.read', 'finance:invoice.export']} requireAll>
 *   <ExportInvoicesButton />
 * </Guard>
 * 
 * // Role-based rendering
 * <Guard role="admin">
 *   <AdminPanel />
 * </Guard>
 * 
 * // Super Admin only
 * <Guard superAdminOnly>
 *   <SystemSettings />
 * </Guard>
 * 
 * // Custom fallback
 * <Guard permission="finance:invoice.create" fallback={<p>Access denied</p>}>
 *   <CreateInvoiceButton />
 * </Guard>
 * ```
 */

'use client';

import { logger } from '@/lib/logger';
import { useAuthRbac } from '@/hooks/useAuthRbac';
import { ReactNode } from 'react';

export interface GuardProps {
  children: ReactNode;
  
  // Single permission check
  permission?: string;
  
  // Multiple permission checks
  permissions?: string[];
  requireAny?: boolean; // If true, user needs ANY of the permissions
  requireAll?: boolean; // If true, user needs ALL of the permissions
  
  // Role-based checks
  role?: string;
  roles?: string[];
  requireAnyRole?: boolean;
  
  // Super Admin check
  superAdminOnly?: boolean;
  
  // Invert the check (render if user does NOT have permission)
  invert?: boolean;
  
  // Custom fallback element (default: null)
  fallback?: ReactNode;
  
  // Show loading state (default: null)
  loadingFallback?: ReactNode;
}

/**
 * Guard component for permission-based rendering
 */
export default function Guard({
  children,
  permission,
  permissions,
  requireAny = false,
  requireAll = false,
  role,
  roles,
  requireAnyRole = false,
  superAdminOnly = false,
  invert = false,
  fallback = null,
  loadingFallback = null,
}: GuardProps) {
  const {
    can,
    canAny,
    canAll,
    hasRole,
    hasAnyRole,
    isSuperAdmin,
    isLoading,
  } = useAuthRbac();
  
  // Show loading state if provided
  if (isLoading && loadingFallback) {
    return <>{loadingFallback}</>;
  }
  
  // Wait for auth to load
  if (isLoading) {
    return null;
  }
  
  let allowed = false;
  
  // Super Admin check (highest priority)
  if (superAdminOnly) {
    allowed = isSuperAdmin;
  }
  // Single permission check
  else if (permission) {
    allowed = can(permission);
  }
  // Multiple permission checks
  else if (permissions && permissions.length > 0) {
    if (requireAll) {
      allowed = canAll(permissions);
    } else if (requireAny) {
      allowed = canAny(permissions);
    } else {
      // Default: require ANY
      allowed = canAny(permissions);
    }
  }
  // Single role check
  else if (role) {
    allowed = hasRole(role);
  }
  // Multiple role checks
  else if (roles && roles.length > 0) {
    if (requireAnyRole) {
      allowed = hasAnyRole(roles);
    } else {
      // Default: require ANY
      allowed = hasAnyRole(roles);
    }
  }
  // No checks specified, allow by default (guard is misconfigured)
  else {
    logger.warn('[Guard] No permission or role checks specified. Allowing by default.');
    allowed = true;
  }
  
  // Invert check if requested
  if (invert) {
    allowed = !allowed;
  }
  
  // Render children if allowed, otherwise render fallback
  return allowed ? <>{children}</> : <>{fallback}</>;
}

/**
 * Convenience components for common patterns
 */

export function SuperAdminOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <Guard superAdminOnly fallback={fallback}>
      {children}
    </Guard>
  );
}

export function RequirePermission({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <Guard permission={permission} fallback={fallback}>
      {children}
    </Guard>
  );
}

export function RequireAnyPermission({
  permissions,
  children,
  fallback = null,
}: {
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <Guard permissions={permissions} requireAny fallback={fallback}>
      {children}
    </Guard>
  );
}

export function RequireAllPermissions({
  permissions,
  children,
  fallback = null,
}: {
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <Guard permissions={permissions} requireAll fallback={fallback}>
      {children}
    </Guard>
  );
}

export function RequireRole({
  role,
  children,
  fallback = null,
}: {
  role: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <Guard role={role} fallback={fallback}>
      {children}
    </Guard>
  );
}
