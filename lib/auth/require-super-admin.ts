/**
 * Super Admin Authorization Guard
 *
 * DRY utility for protecting admin-only API routes and server actions.
 * Consolidates super admin checks in one reusable module.
 *
 * @module lib/auth/require-super-admin
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Session user with admin properties
 */
export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  roles?: string[];
  isSuperAdmin?: boolean;
  organizationId?: string;
}

/**
 * Session with admin user
 */
export interface AdminSession {
  user: AdminUser;
  expires: string;
}

/**
 * Result of admin authorization check
 */
export interface AdminAuthResult {
  authorized: boolean;
  user?: AdminUser;
  error?: string;
  statusCode?: number;
}

/**
 * Route handler with admin context
 */
export type AdminRouteHandler<T = unknown> = (
  request: NextRequest,
  context: { user: AdminUser; params?: Record<string, string> }
) => Promise<NextResponse<T>>;

// ============================================================================
// Constants
// ============================================================================

/**
 * Roles that grant super admin access
 */
export const SUPER_ADMIN_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN", "PLATFORM_ADMIN"] as const;

/**
 * Roles that grant general admin access
 */
export const ADMIN_ROLES = [
  ...SUPER_ADMIN_ROLES,
  "ADMIN",
  "TENANT_ADMIN",
  "CORPORATE_ADMIN",
  "ORG_ADMIN",
] as const;

// ============================================================================
// Core Authorization Functions
// ============================================================================

/**
 * Check if a user has super admin privileges
 *
 * @param user - User object to check
 * @returns Whether user is a super admin
 *
 * @example
 * ```ts
 * const session = await auth();
 * if (isSuperAdmin(session?.user)) {
 *   // Grant full access
 * }
 * ```
 */
export function isSuperAdmin(user?: AdminUser | null): boolean {
  if (!user) return false;

  // Check explicit isSuperAdmin flag
  if (user.isSuperAdmin === true) return true;

  // Check role field
  if (user.role && SUPER_ADMIN_ROLES.includes(user.role as typeof SUPER_ADMIN_ROLES[number])) {
    return true;
  }

  // Check roles array
  if (user.roles?.some((r) => SUPER_ADMIN_ROLES.includes(r as typeof SUPER_ADMIN_ROLES[number]))) {
    return true;
  }

  return false;
}

/**
 * Check if a user has general admin privileges
 *
 * @param user - User object to check
 * @returns Whether user is an admin
 */
export function isAdmin(user?: AdminUser | null): boolean {
  if (!user) return false;

  // Super admins are always admins
  if (isSuperAdmin(user)) return true;

  // Check role field
  if (user.role && ADMIN_ROLES.includes(user.role as typeof ADMIN_ROLES[number])) {
    return true;
  }

  // Check roles array
  if (user.roles?.some((r) => ADMIN_ROLES.includes(r as typeof ADMIN_ROLES[number]))) {
    return true;
  }

  return false;
}

/**
 * Verify super admin access and return result
 *
 * @returns Authorization result with user info
 */
export async function verifySuperAdmin(): Promise<AdminAuthResult> {
  try {
    const session = (await auth()) as AdminSession | null;

    if (!session?.user) {
      return {
        authorized: false,
        error: "Authentication required",
        statusCode: 401,
      };
    }

    if (!isSuperAdmin(session.user)) {
      logger.warn("[Auth] Super admin access denied", {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
      });

      return {
        authorized: false,
        error: "Super admin access required",
        statusCode: 403,
      };
    }

    return {
      authorized: true,
      user: session.user,
    };
  } catch (error) {
    logger.error("[Auth] Super admin verification failed", { error });
    return {
      authorized: false,
      error: "Authorization check failed",
      statusCode: 500,
    };
  }
}

/**
 * Verify general admin access and return result
 *
 * @returns Authorization result with user info
 */
export async function verifyAdmin(): Promise<AdminAuthResult> {
  try {
    const session = (await auth()) as AdminSession | null;

    if (!session?.user) {
      return {
        authorized: false,
        error: "Authentication required",
        statusCode: 401,
      };
    }

    if (!isAdmin(session.user)) {
      logger.warn("[Auth] Admin access denied", {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
      });

      return {
        authorized: false,
        error: "Admin access required",
        statusCode: 403,
      };
    }

    return {
      authorized: true,
      user: session.user,
    };
  } catch (error) {
    logger.error("[Auth] Admin verification failed", { error });
    return {
      authorized: false,
      error: "Authorization check failed",
      statusCode: 500,
    };
  }
}

// ============================================================================
// Route Handler Wrappers
// ============================================================================

/**
 * Wrap an API route handler with super admin authorization
 *
 * @param handler - Route handler function
 * @returns Wrapped handler that checks super admin access
 *
 * @example
 * ```ts
 * // app/api/admin/users/route.ts
 * import { withSuperAdmin } from "@/lib/auth/require-super-admin";
 *
 * export const GET = withSuperAdmin(async (request, { user }) => {
 *   // user is guaranteed to be a super admin here
 *   const users = await fetchAllUsers();
 *   return NextResponse.json({ users });
 * });
 * ```
 */
export function withSuperAdmin<T = unknown>(
  handler: AdminRouteHandler<T>
): (request: NextRequest, context?: { params?: Record<string, string> }) => Promise<NextResponse> {
  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    const authResult = await verifySuperAdmin();

    if (!authResult.authorized || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 403 }
      );
    }

    // Log admin action for audit trail
    logger.info("[Admin] Super admin action", {
      userId: authResult.user.id,
      email: authResult.user.email,
      method: request.method,
      path: request.nextUrl.pathname,
    });

    return handler(request, { user: authResult.user, params: context?.params });
  };
}

/**
 * Wrap an API route handler with general admin authorization
 *
 * @param handler - Route handler function
 * @returns Wrapped handler that checks admin access
 *
 * @example
 * ```ts
 * // app/api/admin/reports/route.ts
 * import { withAdmin } from "@/lib/auth/require-super-admin";
 *
 * export const GET = withAdmin(async (request, { user }) => {
 *   // user is guaranteed to be an admin here
 *   const reports = await fetchReports(user.organizationId);
 *   return NextResponse.json({ reports });
 * });
 * ```
 */
export function withAdmin<T = unknown>(
  handler: AdminRouteHandler<T>
): (request: NextRequest, context?: { params?: Record<string, string> }) => Promise<NextResponse> {
  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    const authResult = await verifyAdmin();

    if (!authResult.authorized || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 403 }
      );
    }

    return handler(request, { user: authResult.user, params: context?.params });
  };
}

// ============================================================================
// Server Action Guards
// ============================================================================

/**
 * Guard a server action with super admin authorization
 *
 * @param action - Server action function
 * @returns Guarded action that checks super admin access
 *
 * @example
 * ```ts
 * // app/actions/admin.ts
 * "use server";
 * import { guardSuperAdmin } from "@/lib/auth/require-super-admin";
 *
 * export const deleteUser = guardSuperAdmin(async (userId: string) => {
 *   await db.users.delete(userId);
 *   return { success: true };
 * });
 * ```
 */
export function guardSuperAdmin<TArgs extends unknown[], TResult>(
  action: (user: AdminUser, ...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult | { error: string }> {
  return async (...args: TArgs) => {
    const authResult = await verifySuperAdmin();

    if (!authResult.authorized || !authResult.user) {
      return { error: authResult.error || "Super admin access required" };
    }

    return action(authResult.user, ...args);
  };
}

/**
 * Guard a server action with general admin authorization
 */
export function guardAdmin<TArgs extends unknown[], TResult>(
  action: (user: AdminUser, ...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult | { error: string }> {
  return async (...args: TArgs) => {
    const authResult = await verifyAdmin();

    if (!authResult.authorized || !authResult.user) {
      return { error: authResult.error || "Admin access required" };
    }

    return action(authResult.user, ...args);
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  isSuperAdmin,
  isAdmin,
  verifySuperAdmin,
  verifyAdmin,
  withSuperAdmin,
  withAdmin,
  guardSuperAdmin,
  guardAdmin,
  SUPER_ADMIN_ROLES,
  ADMIN_ROLES,
};
