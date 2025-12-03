"use client";

import React from "react";
import BaseGuard, {
  RequirePermission as BaseRequirePermission,
  RequireAnyPermission as BaseRequireAnyPermission,
  RequireAllPermissions as BaseRequireAllPermissions,
  RequireRole as BaseRequireRole,
  SuperAdminOnly as BaseSuperAdminOnly,
} from "@/components/Guard";
import { useAuthRbac, useCan } from "@/hooks/useAuthRbac";

/**
 * Compatibility wrapper around the canonical Guard in components/Guard.tsx.
 * Supports legacy props (can/canAny/canAll) while delegating to the shared guard logic.
 */

interface GuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;

  // Permission-based guards (legacy naming)
  can?: string;
  canAny?: string[];
  canAll?: string[];

  // Role-based guards
  role?: string;
  anyRole?: string[];

  // Super Admin guard
  superAdmin?: boolean;

  // Loading state fallback
  loading?: React.ReactNode;
}

export function Guard({
  children,
  fallback = null,
  can,
  canAny,
  canAll,
  role,
  anyRole,
  superAdmin,
  loading = null,
}: GuardProps) {
  // Map legacy props onto the canonical Guard API
  const mappedProps = {
    permission: can,
    permissions: canAll ?? canAny ?? undefined,
    requireAll: !!canAll,
    requireAny: !!canAny && !canAll,
    role,
    roles: anyRole,
    requireAnyRole: Array.isArray(anyRole),
    superAdminOnly: superAdmin,
    fallback,
    loadingFallback: loading,
  };

  return <BaseGuard {...mappedProps}>{children}</BaseGuard>;
}

interface ProtectedSectionProps {
  children: React.ReactNode;
  denied?: React.ReactNode;
  can?: string;
  canAny?: string[];
  canAll?: string[];
  role?: string;
  anyRole?: string[];
  superAdmin?: boolean;
}

export function ProtectedSection(props: ProtectedSectionProps) {
  return <Guard {...props} fallback={props.denied} />;
}

interface CanViewProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function CanView({ permission, children, fallback }: CanViewProps) {
  const canAccess = useCan(permission);
  if (!canAccess) {
    return <>{fallback || null}</>;
  }
  return <>{children}</>;
}

interface SuperAdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function SuperAdminOnly({ children, fallback }: SuperAdminOnlyProps) {
  return <BaseSuperAdminOnly fallback={fallback}>{children}</BaseSuperAdminOnly>;
}

interface RoleGuardProps {
  role: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ role, children, fallback }: RoleGuardProps) {
  const { hasRole, hasAnyRole } = useAuthRbac();
  const hasAccess = Array.isArray(role) ? hasAnyRole(role) : hasRole(role);
  if (!hasAccess) {
    return <>{fallback || null}</>;
  }
  return <>{children}</>;
}

export function AccessDenied({
  message = "Access Denied",
}: {
  message?: string;
}) {
  return (
    <div 
      className="flex items-center justify-center p-8 text-gray-500"
      role="alert"
      aria-live="polite"
    >
      <div className="text-center">
        <svg
          className="mx-auto mb-4 h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <p className="text-sm font-medium" id="access-denied-message">{message}</p>
        <p className="mt-1 text-xs text-gray-400">
          You don&apos;t have permission to view this content
        </p>
      </div>
    </div>
  );
}

// Re-export common helpers from the canonical guard for convenience
export const RequirePermission = BaseRequirePermission;
export const RequireAnyPermission = BaseRequireAnyPermission;
export const RequireAllPermissions = BaseRequireAllPermissions;
export const RequireRole = BaseRequireRole;
