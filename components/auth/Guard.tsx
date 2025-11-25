"use client";

import React from "react";
import { useAuthRbac, useCan, useIsSuperAdmin } from "@/hooks/useAuthRbac";

/**
 * Guard Component - Conditional rendering based on RBAC permissions
 *
 * Usage:
 *   <Guard can="finance:invoice.create">
 *     <CreateInvoiceButton />
 *   </Guard>
 *
 *   <Guard canAny={["hr:employee.read", "hr:employee.write"]}>
 *     <EmployeeSection />
 *   </Guard>
 *
 *   <Guard canAll={["finance:budget.read", "finance:report.read"]}>
 *     <BudgetReportSection />
 *   </Guard>
 *
 *   <Guard role="admin">
 *     <AdminPanel />
 *   </Guard>
 *
 *   <Guard superAdmin>
 *     <SuperAdminDashboard />
 *   </Guard>
 *
 *   <Guard can="aqar:property.delete" fallback={<AccessDenied />}>
 *     <DeletePropertyButton />
 *   </Guard>
 */

interface GuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;

  // Permission-based guards
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

/**
 * Guard Component - Renders children only if permission/role checks pass
 */
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
  const {
    can: checkCan,
    canAny: checkCanAny,
    canAll: checkCanAll,
    hasRole,
    hasAnyRole,
    isLoading,
  } = useAuthRbac();

  // Show loading state if still loading session
  if (isLoading) {
    return <>{loading}</>;
  }

  // Check permissions
  if (can && !checkCan(can)) {
    return <>{fallback}</>;
  }

  if (canAny && !checkCanAny(canAny)) {
    return <>{fallback}</>;
  }

  if (canAll && !checkCanAll(canAll)) {
    return <>{fallback}</>;
  }

  // Check roles
  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  if (anyRole && !hasAnyRole(anyRole)) {
    return <>{fallback}</>;
  }

  // Check super admin
  if (superAdmin && !checkCan("*")) {
    return <>{fallback}</>;
  }

  // All checks passed, render children
  return <>{children}</>;
}

/**
 * ProtectedSection - Shows different content based on permission
 *
 * Usage:
 *   <ProtectedSection
 *     can="finance:invoice.create"
 *     denied={<UpgradePrompt />}
 *   >
 *     <CreateInvoiceForm />
 *   </ProtectedSection>
 */
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

/**
 * CanView - Simple permission check wrapper (alias for Guard with can prop)
 */
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

/**
 * SuperAdminOnly - Renders children only for Super Admins
 */
interface SuperAdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function SuperAdminOnly({ children, fallback }: SuperAdminOnlyProps) {
  const isSuperAdmin = useIsSuperAdmin();

  if (!isSuperAdmin) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
}

/**
 * RoleGuard - Renders children only for specific roles
 */
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

/**
 * AccessDenied - Default fallback component for unauthorized access
 */
export function AccessDenied({
  message = "Access Denied",
}: {
  message?: string;
}) {
  return (
    <div className="flex items-center justify-center p-8 text-gray-500">
      <div className="text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 mb-4"
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
        <p className="text-sm font-medium">{message}</p>
        <p className="text-xs text-gray-400 mt-1">
          You don&apos;t have permission to view this content
        </p>
      </div>
    </div>
  );
}
